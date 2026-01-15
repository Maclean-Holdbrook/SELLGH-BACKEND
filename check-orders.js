import { supabaseAdmin } from './src/config/supabase.js';

async function checkOrders() {
  try {
    console.log('🔍 Checking orders and their commission status...\n');

    // Get all orders
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching orders:', error);
      process.exit(1);
    }

    console.log(`📦 Total orders found (last 10): ${orders?.length || 0}\n`);

    if (orders && orders.length > 0) {
      console.log('=== Order Details ===');
      orders.forEach((order, index) => {
        console.log(`\nOrder ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Total Amount: GHS ${order.total_amount}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Payment Status: ${order.payment_status}`);
        console.log(`  Vendor ID: ${order.vendor_id}`);
        console.log(`  Created: ${order.created_at}`);
      });

      // Check if commissions table exists and has proper structure
      console.log('\n=== Checking Commissions Table ===');
      const { data: commissions, error: commError } = await supabaseAdmin
        .from('commissions')
        .select('*')
        .limit(1);

      if (commError) {
        console.error('❌ Error accessing commissions table:', commError);
        console.log('\n⚠️ The commissions table might not exist or have incorrect permissions');
      } else {
        console.log('✅ Commissions table exists and is accessible');
        console.log(`   Records found: ${commissions?.length || 0}`);
      }

      // Count paid orders
      const paidOrders = orders.filter(o => o.payment_status === 'paid' || o.status === 'completed');
      console.log(`\n📊 Paid/Completed orders: ${paidOrders.length}`);

      if (paidOrders.length > 0) {
        const totalPaid = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        console.log(`   Total value: GHS ${totalPaid.toFixed(2)}`);
        console.log('\n⚠️ These orders should have commission records, but none were found!');
        console.log('   This suggests commissions are not being created automatically.');
      }
    } else {
      console.log('⚠️ No orders found in the database');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkOrders();
