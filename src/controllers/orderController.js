import { supabaseAdmin } from '../config/supabase.js';
import emailService from '../services/emailService.js';

/**
 * Update order status
 * PUT /api/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Get order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Send status update email
    await emailService.sendOrderStatusUpdate({ ...order, status }, status);

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
};

/**
 * Get order by ID
 * GET /api/orders/:id
 */
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting single order with ID:', id);

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            product_images (
              image_url,
              is_primary
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      console.log('❌ Order not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order'
    });
  }
};

/**
 * Get vendor orders
 * GET /api/orders/vendor/:vendorId
 */
export const getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;
    console.log('🔍 Getting vendor orders for:', vendorId);

    // Fetch order items
    const { data: orderItems, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!orderItems || orderItems.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get unique order IDs
    const orderIds = [...new Set(orderItems.map(item => item.order_id))];

    // Fetch fresh order data
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, payment_status, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_region, created_at')
      .in('id', orderIds);

    if (ordersError) {
      throw ordersError;
    }

    // Create order map
    const orderMap = {};
    ordersData?.forEach(order => {
      orderMap[order.id] = order;
    });

    // Group by order
    const groupedOrders = {};
    orderItems?.forEach(item => {
      const orderId = item.order_id;
      const order = orderMap[orderId];
      if (!order) return;

      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = {
          ...order,
          items: []
        };
      }
      groupedOrders[orderId].items.push(item);
    });

    res.json({
      success: true,
      data: Object.values(groupedOrders)
    });

  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor orders'
    });
  }
};

/**
 * Get vendor order statistics
 * GET /api/orders/vendor/:vendorId/stats
 */
export const getVendorOrderStats = async (req, res) => {
  try {
    const { vendorId } = req.params;

    console.log('🔍 Getting stats for vendor ID:', vendorId);
    console.log('🔍 Vendor ID type:', typeof vendorId);

    // First, let's see ALL order_items in the database to debug
    const { data: allItems, error: allError } = await supabaseAdmin
      .from('order_items')
      .select('id, vendor_id, product_name')
      .limit(10);

    console.log('📋 Sample of ALL order_items in database:', allItems);
    if (allItems?.length > 0) {
      console.log('📋 First item vendor_id:', allItems[0].vendor_id, 'type:', typeof allItems[0].vendor_id);
      console.log('📋 Comparing:', vendorId, '===', allItems[0].vendor_id, '?', vendorId === allItems[0].vendor_id);
    }

    // Get all order items for this vendor
    // Note: Using separate queries to avoid stale nested data
    const { data: orderItems, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('ℹ️ No order items found for this vendor');
      return res.json({
        success: true,
        totalSales: 0,
        orderCount: 0,
        recentOrders: []
      });
    }

    // Get unique order IDs
    const orderIds = [...new Set(orderItems.map(item => item.order_id))];
    console.log('📦 Found order IDs:', orderIds);

    // Fetch fresh order data
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, payment_status, customer_name, created_at')
      .in('id', orderIds);

    console.log('📦 Query result - Order items found:', orderItems?.length || 0);
    console.log('📦 Fresh orders fetched:', ordersData?.length || 0);
    if (ordersData?.length > 0) {
      console.log('First order payment status:', ordersData[0].payment_status);
    }

    if (ordersError) {
      console.error('❌ Orders fetch error:', ordersError);
      throw ordersError;
    }

    // Create a map for quick order lookup
    const orderMap = {};
    ordersData?.forEach(order => {
      orderMap[order.id] = order;
    });

    // Group by order and calculate stats
    const groupedOrders = {};
    let totalSales = 0;

    orderItems?.forEach(item => {
      const orderId = item.order_id;
      const order = orderMap[orderId];

      if (!order) return;

      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = {
          ...order,
          total: 0,
          items: []
        };
      }

      groupedOrders[orderId].items.push(item);
      groupedOrders[orderId].total += item.subtotal || 0;

      // Only count paid orders in total sales
      if (order.payment_status === 'paid') {
        totalSales += item.subtotal || 0;
      }
    });

    const ordersArray = Object.values(groupedOrders);
    console.log('✅ Total sales calculated:', totalSales);
    console.log('✅ Order count:', ordersArray.length);

    // Get recent orders (last 10)
    const recentOrders = ordersArray.slice(0, 10);

    res.json({
      success: true,
      totalSales,
      orderCount: ordersArray.length,
      recentOrders
    });

  } catch (error) {
    console.error('Get vendor order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor order stats'
    });
  }
};

/**
 * Get all orders (Admin only)
 * GET /api/orders
 */
export const getAllOrders = async (req, res) => {
  try {
    console.log('📋 Getting all orders for admin');
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('📋 Found orders:', orders?.length || 0);
    res.json({
      success: true,
      data: orders || []
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders'
    });
  }
};

/**
 * Get admin statistics
 * GET /api/orders/admin/stats
 */
export const getAdminStats = async (req, res) => {
  try {
    console.log('📊 Getting admin stats');
    // Get total orders
    const { count: orderCount } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get total revenue from paid orders
    const { data: paidOrders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid');

    if (error) throw error;

    const totalRevenue = paidOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const platformCommission = totalRevenue * 0.05; // 5% commission

    console.log('📊 Stats:', { orderCount, totalRevenue, platformCommission });
    res.json({
      success: true,
      totalOrders: orderCount || 0,
      totalRevenue,
      platformCommission
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin stats'
    });
  }
};

/**
 * Debug endpoint - Get all order items to see vendor_ids
 * GET /api/orders/debug/all-items
 */
export const debugAllOrderItems = async (req, res) => {
  try {
    const { data: allItems, error } = await supabaseAdmin
      .from('order_items')
      .select('id, vendor_id, product_name, order_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      count: allItems?.length || 0,
      items: allItems
    });
  } catch (error) {
    console.error('Debug order items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order items'
    });
  }
};

export default {
  updateOrderStatus,
  getOrder,
  getVendorOrders,
  getVendorOrderStats,
  getAllOrders,
  getAdminStats,
  debugAllOrderItems
};
