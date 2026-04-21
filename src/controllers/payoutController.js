import { supabaseAdmin } from '../config/supabase.js';
import { getPayoutCommissionIds } from '../utils/schemaContract.js';

/**
 * Get vendor commissions (for vendor dashboard)
 * GET /api/payouts/commissions
 */
export const getVendorCommissions = async (req, res) => {
  try {
    const { status } = req.query;

    // Get vendor ID from authenticated user
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor profile not found'
      });
    }

    // Build query
    let query = supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: commissions, error } = await query;

    if (error) throw error;

    // Calculate totals
    const totals = {
      pending: 0,
      settled: 0,
      total_earned: 0
    };

    commissions.forEach(commission => {
      if (commission.status === 'pending') {
        totals.pending += parseFloat(commission.vendor_amount);
      } else if (commission.status === 'settled') {
        totals.settled += parseFloat(commission.vendor_amount);
      }
      totals.total_earned += parseFloat(commission.vendor_amount);
    });

    res.json({
      success: true,
      data: {
        commissions,
        totals
      }
    });

  } catch (error) {
    console.error('Get vendor commissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get commissions'
    });
  }
};

/**
 * Get vendor payouts (for vendor dashboard)
 * GET /api/payouts/history
 */
export const getVendorPayouts = async (req, res) => {
  try {
    // Get vendor ID from authenticated user
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor profile not found'
      });
    }

    const { data: payouts, error } = await supabaseAdmin
      .from('vendor_payouts')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: payouts
    });

  } catch (error) {
    console.error('Get vendor payouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payouts'
    });
  }
};

/**
 * Get all commissions (admin only)
 * GET /api/admin/payouts/commissions
 */
export const getAllCommissions = async (req, res) => {
  try {
    const { status, vendor_id } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('commissions')
      .select(`
        *,
        vendors (
          id,
          business_name,
          mtn_momo_number,
          vodafone_cash_number,
          airteltigo_number
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by vendor if provided
    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }

    const { data: commissions, error } = await query;

    if (error) throw error;

    // Calculate platform totals
    const totals = {
      total_commission: 0,
      pending_commission: 0,
      settled_commission: 0
    };

    commissions.forEach(commission => {
      totals.total_commission += parseFloat(commission.platform_commission);
      if (commission.status === 'pending') {
        totals.pending_commission += parseFloat(commission.platform_commission);
      } else if (commission.status === 'settled') {
        totals.settled_commission += parseFloat(commission.platform_commission);
      }
    });

    res.json({
      success: true,
      data: {
        commissions,
        totals
      }
    });

  } catch (error) {
    console.error('Get all commissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get commissions'
    });
  }
};

/**
 * Get all vendor payouts (admin only)
 * GET /api/admin/payouts
 */
export const getAllPayouts = async (req, res) => {
  try {
    const { status, vendor_id } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('vendor_payouts')
      .select(`
        *,
        vendors (
          id,
          business_name,
          business_email,
          business_phone
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by vendor if provided
    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }

    const { data: payouts, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: payouts
    });

  } catch (error) {
    console.error('Get all payouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payouts'
    });
  }
};

/**
 * Create vendor payout (admin only)
 * POST /api/admin/payouts
 */
export const createVendorPayout = async (req, res) => {
  try {
    const {
      vendor_id,
      period_start,
      period_end,
      payout_method,
      notes
    } = req.body;

    // Validate required fields
    if (!vendor_id || !period_start || !period_end) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vendor_id, period_start, period_end'
      });
    }

    // Get all pending commissions for vendor in the period
    const { data: commissions, error: commissionsError } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('vendor_id', vendor_id)
      .eq('status', 'pending')
      .gte('created_at', period_start)
      .lte('created_at', period_end);

    if (commissionsError) throw commissionsError;

    if (!commissions || commissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pending commissions found for this vendor in the specified period'
      });
    }

    // Calculate total payout amount
    const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.vendor_amount), 0);
    const commissionIds = commissions.map(c => c.id);

    // Create payout record
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('vendor_payouts')
      .insert({
        vendor_id,
        amount: totalAmount,
        period_start,
        period_end,
        status: 'pending',
        payout_method: payout_method || 'momo',
        commission_ids: commissionIds,
        order_ids: commissionIds,
        notes
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    res.status(201).json({
      success: true,
      data: payout
    });

  } catch (error) {
    console.error('Create vendor payout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payout'
    });
  }
};

/**
 * Update payout status (admin only)
 * PATCH /api/admin/payouts/:payout_id
 */
export const updatePayoutStatus = async (req, res) => {
  try {
    const { payout_id } = req.params;
    const { status, transaction_reference, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Get the payout
    const { data: payout, error: fetchError } = await supabaseAdmin
      .from('vendor_payouts')
      .select('*')
      .eq('id', payout_id)
      .single();

    if (fetchError || !payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }

    // Update payout status
    const updateData = {
      status,
      notes,
      updated_at: new Date().toISOString()
    };

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
      updateData.transaction_reference = transaction_reference;

      const commissionIds = getPayoutCommissionIds(payout);
      let commissionsToSettle = [];

      if (commissionIds.length > 0) {
        const { data: directCommissionMatches } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .in('id', commissionIds);

        if (directCommissionMatches?.length) {
          commissionsToSettle = directCommissionMatches.map((commission) => commission.id);
        } else {
          const { data: legacyCommissionMatches } = await supabaseAdmin
            .from('commissions')
            .select('id')
            .eq('vendor_id', payout.vendor_id)
            .in('order_id', commissionIds);

          commissionsToSettle = legacyCommissionMatches?.map((commission) => commission.id) || [];
        }
      }

      if (commissionsToSettle.length > 0) {
        const { error: commissionsUpdateError } = await supabaseAdmin
          .from('commissions')
          .update({
            status: 'settled',
            settled_at: new Date().toISOString()
          })
          .in('id', commissionsToSettle);

        if (commissionsUpdateError) {
          console.error('Failed to update commission status:', commissionsUpdateError);
        }
      }
    }

    const { data: updatedPayout, error: updateError } = await supabaseAdmin
      .from('vendor_payouts')
      .update(updateData)
      .eq('id', payout_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: updatedPayout
    });

  } catch (error) {
    console.error('Update payout status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payout status'
    });
  }
};

/**
 * Get payout statistics (admin only)
 * GET /api/admin/payouts/stats
 */
export const getPayoutStats = async (req, res) => {
  try {
    // Get commission stats
    const { data: commissions } = await supabaseAdmin
      .from('commissions')
      .select('status, vendor_amount, platform_commission');

    const stats = {
      total_revenue: 0,
      platform_commission: 0,
      vendor_earnings: 0,
      pending_payouts: 0,
      paid_payouts: 0
    };

    if (commissions) {
      commissions.forEach(c => {
        stats.total_revenue += parseFloat(c.vendor_amount) + parseFloat(c.platform_commission);
        stats.platform_commission += parseFloat(c.platform_commission);
        stats.vendor_earnings += parseFloat(c.vendor_amount);

        if (c.status === 'pending') {
          stats.pending_payouts += parseFloat(c.vendor_amount);
        } else if (c.status === 'settled') {
          stats.paid_payouts += parseFloat(c.vendor_amount);
        }
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get payout stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout statistics'
    });
  }
};

/**
 * Get platform withdrawals (admin only)
 * GET /api/admin/withdrawals
 */
export const getPlatformWithdrawals = async (req, res) => {
  try {
    const { data: withdrawals, error } = await supabaseAdmin
      .from('platform_withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: withdrawals || []
    });

  } catch (error) {
    console.error('Get platform withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform withdrawals'
    });
  }
};

/**
 * Create platform withdrawal (admin only)
 * POST /api/admin/withdrawals
 */
export const createPlatformWithdrawal = async (req, res) => {
  try {
    const {
      amount,
      withdrawal_method,
      account_details,
      notes
    } = req.body;

    // Validate required fields
    if (!amount || !withdrawal_method || !account_details) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, withdrawal_method, account_details'
      });
    }

    // Get total available commission
    const { data: commissions } = await supabaseAdmin
      .from('commissions')
      .select('platform_commission');

    const totalCommission = commissions?.reduce((sum, c) => sum + parseFloat(c.platform_commission), 0) || 0;

    // Get total withdrawn
    const { data: withdrawals } = await supabaseAdmin
      .from('platform_withdrawals')
      .select('amount')
      .in('status', ['completed', 'processing']);

    const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;
    const availableBalance = totalCommission - totalWithdrawn;

    // Check if amount is available
    if (parseFloat(amount) > availableBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}`,
        available_balance: availableBalance
      });
    }

    // Create withdrawal record
    const { data: withdrawal, error } = await supabaseAdmin
      .from('platform_withdrawals')
      .insert({
        amount: parseFloat(amount),
        withdrawal_method,
        account_details,
        status: 'pending',
        notes,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: 'Withdrawal request created successfully'
    });

  } catch (error) {
    console.error('Create platform withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create withdrawal'
    });
  }
};

/**
 * Update withdrawal status (admin only)
 * PATCH /api/admin/withdrawals/:withdrawal_id
 */
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawal_id } = req.params;
    const { status, transaction_reference, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const updateData = {
      status,
      notes,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.transaction_reference = transaction_reference;
    }

    const { data: withdrawal, error } = await supabaseAdmin
      .from('platform_withdrawals')
      .update(updateData)
      .eq('id', withdrawal_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: withdrawal
    });

  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update withdrawal status'
    });
  }
};

/**
 * Get platform balance (admin only)
 * GET /api/admin/balance
 */
export const getPlatformBalance = async (req, res) => {
  try {
    // Get total commission
    const { data: commissions } = await supabaseAdmin
      .from('commissions')
      .select('platform_commission, status');

    const totalCommission = commissions?.reduce((sum, c) => sum + parseFloat(c.platform_commission), 0) || 0;
    const pendingCommission = commissions?.filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.platform_commission), 0) || 0;

    // Get total withdrawn
    const { data: withdrawals } = await supabaseAdmin
      .from('platform_withdrawals')
      .select('amount, status');

    const completedWithdrawals = withdrawals?.filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;
    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;

    const availableBalance = totalCommission - completedWithdrawals - pendingWithdrawals;

    res.json({
      success: true,
      data: {
        total_commission: totalCommission,
        pending_commission: pendingCommission,
        completed_withdrawals: completedWithdrawals,
        pending_withdrawals: pendingWithdrawals,
        available_balance: availableBalance
      }
    });

  } catch (error) {
    console.error('Get platform balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform balance'
    });
  }
};

/**
 * Request vendor payout/withdrawal (vendor self-service)
 * POST /api/payouts/vendor/request
 */
export const requestVendorPayout = async (req, res) => {
  try {
    const {
      amount,
      payment_method,
      account_details,
      notes
    } = req.body;

    // Validate required fields
    if (!amount || !payment_method || !account_details) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, payment_method, account_details'
      });
    }

    // Get vendor ID from authenticated user
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor profile not found'
      });
    }

    // Check available balance (pending commissions)
    const { data: commissions } = await supabaseAdmin
      .from('commissions')
      .select('vendor_amount')
      .eq('vendor_id', vendor.id)
      .eq('status', 'pending');

    const availableBalance = commissions?.reduce((sum, c) => sum + parseFloat(c.vendor_amount), 0) || 0;

    if (parseFloat(amount) > availableBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}`,
        available_balance: availableBalance
      });
    }

    if (parseFloat(amount) < 10) {
      return res.status(400).json({
        success: false,
        error: 'Minimum withdrawal amount is GHS 10.00'
      });
    }

    // Get pending commission IDs to settle
    const commissionIds = commissions.map(c => c.id);

    // Create payout request
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('vendor_payouts')
      .insert({
        vendor_id: vendor.id,
        amount: parseFloat(amount),
        period_start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
        period_end: new Date().toISOString().split('T')[0], // Today
        status: 'pending', // Admin will process it
        payout_method: payment_method,
        account_details: account_details,
        notes,
        commission_ids: commissionIds,
        order_ids: commissionIds // Legacy compatibility with older rows/UI
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    console.log(`✅ Vendor withdrawal request created: ${vendor.id} - GHS ${amount}`);

    res.status(201).json({
      success: true,
      data: payout,
      message: 'Withdrawal request submitted successfully. Admin will process it soon.'
    });

  } catch (error) {
    console.error('Request vendor payout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit withdrawal request'
    });
  }
};

export default {
  getVendorCommissions,
  getVendorPayouts,
  getAllCommissions,
  getAllPayouts,
  createVendorPayout,
  updatePayoutStatus,
  getPayoutStats,
  getPlatformWithdrawals,
  createPlatformWithdrawal,
  updateWithdrawalStatus,
  getPlatformBalance,
  requestVendorPayout
};
