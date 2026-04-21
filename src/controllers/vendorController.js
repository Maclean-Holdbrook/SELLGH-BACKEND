import { supabase, supabaseAdmin } from '../config/supabase.js';
import paystackService from '../services/paystackService.js';
import { getLegacyVendorPayload, getVendorSubaccountContact } from '../utils/schemaContract.js';

/**
 * Get vendor profile by user ID
 */
export const getVendorProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ vendor: data });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({ error: 'Failed to fetch vendor profile' });
  }
};

/**
 * Create vendor profile
 */
export const createVendorProfile = async (req, res) => {
  try {
    const {
      business_name,
    } = req.body;

    // Validate required fields
    if (!business_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if vendor profile already exists
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Vendor profile already exists' });
    }

    // Create vendor profile
    const vendorPayload = getLegacyVendorPayload(req.body);

    const { data, error } = await supabase
      .from('vendors')
      .insert([
        {
          user_id: req.user.id,
          ...vendorPayload,
          is_verified: false,
          verification_status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ vendor: data });
  } catch (error) {
    console.error('Error creating vendor profile:', error);
    res.status(500).json({ error: 'Failed to create vendor profile' });
  }
};

/**
 * Update vendor profile
 */
export const updateVendorProfile = async (req, res) => {
  try {
    const updates = getLegacyVendorPayload(req.body);

    // Remove fields that shouldn't be updated by vendor
    delete updates.is_verified;
    delete updates.verification_status;
    delete updates.user_id;
    delete updates.id;

    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ vendor: data });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    res.status(500).json({ error: 'Failed to update vendor profile' });
  }
};

/**
 * Get all vendors (for admin or public verified vendors)
 */
export const getAllVendors = async (req, res) => {
  try {
    const { status } = req.query;

    // Use supabaseAdmin to bypass RLS
    let query = supabaseAdmin
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by verification_status if provided
    if (status && status !== 'all') {
      query = query.eq('verification_status', status);
    }

    const { data: vendors, error } = await query;

    if (error) throw error;

    // Fetch user info for each vendor
    const vendorsWithUsers = await Promise.all(
      (vendors || []).map(async (vendor) => {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('full_name, email')
          .eq('id', vendor.user_id)
          .single();

        return {
          ...vendor,
          users: userData
        };
      })
    );

    res.json({ vendors: vendorsWithUsers });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

/**
 * Verify vendor (admin only)
 */
export const verifyVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { is_verified, verification_status } = req.body;

    // First, get the vendor details
    const { data: vendor, error: fetchError } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (fetchError || !vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Create Paystack subaccount if approving vendor and subaccount doesn't exist
    let subaccountData = {};
    const { accountNumber, provider: momoProvider, contactEmail, contactPhone } = getVendorSubaccountContact(vendor);

    if (verification_status === 'approved' && !vendor.paystack_subaccount_code) {
      console.log('Creating Paystack subaccount for vendor:', vendor.business_name);

      if (!accountNumber) {
        console.warn('No mobile money number found for vendor:', vendor.id);
        // Continue anyway - subaccount can be added later
      } else {
        const subaccountResult = await paystackService.createSubaccount({
          business_name: vendor.business_name,
          settlement_bank: momoProvider, // MTN, VOD, or TGO
          account_number: accountNumber,
          percentage_charge: 5, // Platform takes 5%
          primary_contact_email: contactEmail,
          primary_contact_name: vendor.momo_name || vendor.business_name,
          primary_contact_phone: contactPhone,
          metadata: {
            vendor_id: vendor.id,
            business_registration: vendor.business_registration_number
          }
        });

        if (subaccountResult.success) {
          console.log('✅ Subaccount created successfully:', subaccountResult.data.subaccount_code);
          subaccountData = {
            paystack_subaccount_code: subaccountResult.data.subaccount_code,
            paystack_subaccount_id: subaccountResult.data.id,
            subaccount_created_at: new Date().toISOString()
          };
        } else {
          console.error('❌ Failed to create subaccount:', subaccountResult.error);

          // Check if this is a test mode limitation
          if (subaccountResult.error?.includes('invalid') || subaccountResult.error?.includes('Account details')) {
            console.warn('⚠️  Note: Paystack test mode has limitations with Mobile Money subaccounts.');
            console.warn('⚠️  This will work in production with live keys and real Mobile Money numbers.');
          }

          // Continue anyway - admin can create subaccount manually later
          // or it will work when switching to production
        }
      }
    }

    // Update vendor with verification status and subaccount info
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .update({
        is_verified,
        verification_status,
        verification_date: is_verified ? new Date().toISOString() : null,
        ...subaccountData
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;

    // Prepare detailed response
    const response = {
      vendor: data,
      subaccount_status: {
        created: !!data.paystack_subaccount_code,
        subaccount_code: data.paystack_subaccount_code || null,
        created_at: data.subaccount_created_at || null
      }
    };

    if (subaccountData.paystack_subaccount_code) {
      response.message = 'Vendor verified and Paystack subaccount created successfully';
    } else if (verification_status === 'approved' && !accountNumber) {
      response.message = 'Vendor verified but no Mobile Money number found for subaccount creation';
      response.warning = 'Please update vendor Mobile Money details and create subaccount manually';
    } else if (verification_status === 'approved' && accountNumber) {
      response.message = 'Vendor verified (subaccount creation pending)';
      response.info = 'Subaccount creation failed in test mode. This is expected with Paystack test keys. Switch to live keys in production to enable automatic subaccount creation.';
      response.manual_action = `You can create subaccount later: POST /api/vendors/${vendorId}/subaccount`;
    } else {
      response.message = 'Vendor verification status updated';
    }

    res.json(response);
  } catch (error) {
    console.error('Error verifying vendor:', error);
    res.status(500).json({ error: 'Failed to verify vendor' });
  }
};

/**
 * Create or update Paystack subaccount for vendor (admin only)
 */
export const createVendorSubaccount = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Get vendor details
    const { data: vendor, error: fetchError } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (fetchError || !vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    // Check if vendor is verified
    if (vendor.verification_status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Vendor must be approved before creating subaccount'
      });
    }

    // Check if subaccount already exists
    if (vendor.paystack_subaccount_code) {
      return res.status(400).json({
        success: false,
        error: 'Vendor already has a Paystack subaccount',
        subaccount_code: vendor.paystack_subaccount_code
      });
    }

    // Get Mobile Money number
    const { accountNumber, provider: momoProvider, contactEmail, contactPhone } = getVendorSubaccountContact(vendor);

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        error: 'No Mobile Money number found for vendor',
        hint: 'Please update vendor profile with MTN, Vodafone, or AirtelTigo number'
      });
    }

    // Create subaccount
    console.log('Creating Paystack subaccount for vendor:', vendor.business_name);
    const subaccountResult = await paystackService.createSubaccount({
      business_name: vendor.business_name,
      settlement_bank: momoProvider,
      account_number: accountNumber,
      percentage_charge: 5,
      primary_contact_email: contactEmail,
      primary_contact_name: vendor.momo_name || vendor.business_name,
      primary_contact_phone: contactPhone,
      metadata: {
        vendor_id: vendor.id,
        business_registration: vendor.business_registration_number
      }
    });

    if (!subaccountResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create Paystack subaccount',
        details: subaccountResult.error
      });
    }

    // Update vendor with subaccount info
    const { data: updatedVendor, error: updateError } = await supabaseAdmin
      .from('vendors')
      .update({
        paystack_subaccount_code: subaccountResult.data.subaccount_code,
        paystack_subaccount_id: subaccountResult.data.id,
        subaccount_created_at: new Date().toISOString()
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Paystack subaccount created successfully',
      vendor: updatedVendor,
      subaccount: {
        code: subaccountResult.data.subaccount_code,
        id: subaccountResult.data.id,
        settlement_bank: momoProvider,
        account_number: accountNumber,
        percentage_charge: 5
      }
    });

  } catch (error) {
    console.error('Error creating vendor subaccount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create vendor subaccount'
    });
  }
};

/**
 * Get vendor's Paystack subaccount details (admin only)
 */
export const getVendorSubaccount = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Get vendor details
    const { data: vendor, error: fetchError } = await supabaseAdmin
      .from('vendors')
      .select('id, business_name, paystack_subaccount_code, paystack_subaccount_id, subaccount_created_at, mtn_momo_number, vodafone_cash_number, airteltigo_number')
      .eq('id', vendorId)
      .single();

    if (fetchError || !vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    const response = {
      success: true,
      vendor_id: vendor.id,
      business_name: vendor.business_name,
      has_subaccount: !!vendor.paystack_subaccount_code
    };

    if (vendor.paystack_subaccount_code) {
      // Fetch details from Paystack
      const subaccountResult = await paystackService.getSubaccount(vendor.paystack_subaccount_code);

      if (subaccountResult.success) {
        response.subaccount = {
          code: vendor.paystack_subaccount_code,
          id: vendor.paystack_subaccount_id,
          created_at: vendor.subaccount_created_at,
          paystack_details: subaccountResult.data
        };
      } else {
        response.subaccount = {
          code: vendor.paystack_subaccount_code,
          id: vendor.paystack_subaccount_id,
          created_at: vendor.subaccount_created_at,
          error: 'Could not fetch details from Paystack'
        };
      }
    } else {
      response.message = 'No subaccount created for this vendor';
      response.mobile_money_numbers = {
        mtn: vendor.mtn_momo_number || null,
        vodafone: vendor.vodafone_cash_number || null,
        airteltigo: vendor.airteltigo_number || null
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error getting vendor subaccount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor subaccount details'
    });
  }
};
