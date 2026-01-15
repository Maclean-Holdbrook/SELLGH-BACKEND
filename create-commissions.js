import { supabaseAdmin } from './src/config/supabase.js';

async function createCommissions() {
  try {
    console.log('🔧 Creating commission records for paid orders...\n');

    // Platform commission rate (5%)
    const PLATFORM_COMMISSION_RATE = 0.05;

    // Get all paid orders without commissions
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .in('payment_status', ['paid'])
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      process.exit(1);
    }

    console.log(`📦 Found ${orders?.length || 0} paid orders\n`);

    if (!orders || orders.length === 0) {
      console.log('✅ No paid orders found. Nothing to do.');
      process.exit(0);
    }

    let created = 0;
    let skipped = 0;

    for (const order of orders) {
      // Check if commission already exists
      const { data: existingComm } = await supabaseAdmin
        .from('commissions')
        .select('id')
        .eq('order_id', order.id)
        .single();

      if (existingComm) {
        console.log(`⏭️  Order ${order.id} already has commission, skipping`);
        skipped++;
        continue;
      }

      const totalAmount = parseFloat(order.total_amount);
      const platformCommission = totalAmount * PLATFORM_COMMISSION_RATE;
      const vendorAmount = totalAmount - platformCommission;

      console.log(`\n📝 Creating commission for order ${order.id}:`);
      console.log(`   Total: GHS ${totalAmount.toFixed(2)}`);
      console.log(`   Platform (5%): GHS ${platformCommission.toFixed(2)}`);
      console.log(`   Vendor (95%): GHS ${vendorAmount.toFixed(2)}`);

      // Create commission record
      const { data: commission, error: commError } = await supabaseAdmin
        .from('commissions')
        .insert({
          order_id: order.id,
          vendor_id: order.vendor_id || null,
          order_total: totalAmount,
          platform_commission: platformCommission,
          vendor_amount: vendorAmount,
          status: 'pending',
          created_at: order.created_at
        })
        .select()
        .single();

      if (commError) {
        console.error(`   ❌ Error creating commission:`, commError);
        continue;
      }

      console.log(`   ✅ Commission created: ${commission.id}`);
      created++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`✅ Created: ${created} commissions`);
    console.log(`⏭️  Skipped: ${skipped} (already exists)`);

    // Calculate new balance
    const { data: allCommissions } = await supabaseAdmin
      .from('commissions')
      .select('platform_commission');

    const totalCommission = allCommissions?.reduce((sum, c) => sum + parseFloat(c.platform_commission), 0) || 0;
    console.log(`\n💰 Total Platform Commission: GHS ${totalCommission.toFixed(2)}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createCommissions();
