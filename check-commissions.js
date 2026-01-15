import { supabaseAdmin } from './src/config/supabase.js';

async function checkCommissions() {
  try {
    console.log('🔍 Checking platform commissions...\n');

    // Get all commissions
    const { data: commissions, error } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching commissions:', error);
      process.exit(1);
    }

    console.log(`📊 Total commissions found: ${commissions?.length || 0}`);

    if (commissions && commissions.length > 0) {
      console.log('\n=== Commission Details ===');
      commissions.forEach((c, index) => {
        console.log(`\nCommission ${index + 1}:`);
        console.log(`  Order ID: ${c.order_id}`);
        console.log(`  Vendor Amount: GHS ${c.vendor_amount}`);
        console.log(`  Platform Commission: GHS ${c.platform_commission}`);
        console.log(`  Status: ${c.status}`);
        console.log(`  Created: ${c.created_at}`);
      });

      // Calculate totals
      const totalCommission = commissions.reduce((sum, c) => sum + parseFloat(c.platform_commission), 0);
      const pendingCommission = commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + parseFloat(c.platform_commission), 0);
      const settledCommission = commissions
        .filter(c => c.status === 'settled')
        .reduce((sum, c) => sum + parseFloat(c.platform_commission), 0);

      console.log('\n=== Platform Commission Summary ===');
      console.log(`Total Platform Commission: GHS ${totalCommission.toFixed(2)}`);
      console.log(`Pending Commission: GHS ${pendingCommission.toFixed(2)}`);
      console.log(`Settled Commission: GHS ${settledCommission.toFixed(2)}`);
    } else {
      console.log('\n⚠️ No commissions found in the database');
    }

    // Check withdrawals
    const { data: withdrawals, error: withdrawError } = await supabaseAdmin
      .from('platform_withdrawals')
      .select('*');

    if (withdrawError) {
      console.error('❌ Error fetching withdrawals:', withdrawError);
    } else {
      console.log(`\n💰 Total withdrawals found: ${withdrawals?.length || 0}`);

      if (withdrawals && withdrawals.length > 0) {
        const completedWithdrawals = withdrawals
          .filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + parseFloat(w.amount), 0);
        const pendingWithdrawals = withdrawals
          .filter(w => w.status === 'pending' || w.status === 'processing')
          .reduce((sum, w) => sum + parseFloat(w.amount), 0);

        console.log(`Completed Withdrawals: GHS ${completedWithdrawals.toFixed(2)}`);
        console.log(`Pending Withdrawals: GHS ${pendingWithdrawals.toFixed(2)}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkCommissions();
