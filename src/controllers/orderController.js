import { supabaseAdmin } from '../config/supabase.js';
import emailService from '../services/emailService.js';
import paystackService from '../services/paystackService.js';
import { getLineItemTotal } from '../utils/schemaContract.js';

const buildOrderNumber = () => `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const getVendorIdForUser = async (userId) => {
  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return vendor?.id || null;
};

const initializeOrderPayment = async ({ order, paymentMethod }) => {
  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from('order_items')
    .select('vendor_id, total, subtotal')
    .eq('order_id', order.id);

  if (orderItemsError) {
    throw orderItemsError;
  }

  const reference = `PAY-${order.order_number}-${Date.now()}`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://sellgh.vercel.app';
  const callbackUrl = `${frontendUrl}/shop`;

  const paymentData = {
    email: order.customer_email,
    amount: Math.round(order.total_amount * 100),
    reference,
    callback_url: callbackUrl,
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      payment_method: paymentMethod,
      custom_fields: [
        {
          display_name: 'Order Number',
          variable_name: 'order_number',
          value: order.order_number,
        },
        {
          display_name: 'Customer',
          variable_name: 'customer_name',
          value: order.customer_name,
        },
      ],
    },
  };

  if (orderItems?.length) {
    const vendorAmounts = {};
    for (const item of orderItems) {
      if (!vendorAmounts[item.vendor_id]) {
        vendorAmounts[item.vendor_id] = 0;
      }
      vendorAmounts[item.vendor_id] += getLineItemTotal(item);
    }

    const vendorSubaccounts = [];
    for (const vendorId of Object.keys(vendorAmounts)) {
      const { data: vendor } = await supabaseAdmin
        .from('vendors')
        .select('paystack_subaccount_code')
        .eq('id', vendorId)
        .maybeSingle();

      if (vendor?.paystack_subaccount_code) {
        vendorSubaccounts.push({
          subaccount: vendor.paystack_subaccount_code,
          share: Math.round(vendorAmounts[vendorId] * 0.95 * 100),
        });
      }
    }

    if (vendorSubaccounts.length > 0) {
      paymentData.subaccount = vendorSubaccounts[0].subaccount;
      if (vendorSubaccounts.length > 1) {
        paymentData.split = vendorSubaccounts;
      }
    }
  }

  const result = await paystackService.initializeTransaction(paymentData);
  if (!result.success) {
    throw new Error(result.error || 'Payment initialization failed');
  }

  const { error: orderUpdateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_reference: reference,
      payment_method: paymentMethod,
    })
    .eq('id', order.id);

  if (orderUpdateError) {
    throw orderUpdateError;
  }

  try {
    await supabaseAdmin
      .from('transactions')
      .insert({
        order_id: order.id,
        reference,
        amount: order.total_amount,
        payment_method: paymentMethod,
        status: 'pending',
        provider: 'paystack',
      });
  } catch (txError) {
    console.warn('Transaction record not created (table may not exist):', txError.message);
  }

  return {
    reference,
    authorization_url: result.data.authorization_url,
    access_code: result.data.access_code,
  };
};

/**
 * Create an order and initialize payment in a trusted context
 * POST /api/orders/checkout
 */
export const createCheckout = async (req, res) => {
  let createdOrderId = null;

  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_region,
      notes,
      payment_method,
      cart_items,
    } = req.body;

    const productIds = cart_items.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, stock_quantity, vendor_id, is_active, product_images(image_url, is_primary)')
      .in('id', productIds);

    if (productsError) {
      throw productsError;
    }

    const productMap = new Map((products || []).map((product) => [product.id, product]));
    const orderItems = [];
    let total = 0;

    for (const item of cart_items) {
      const product = productMap.get(item.product_id);

      if (!product || !product.is_active) {
        return res.status(400).json({
          success: false,
          error: 'One or more products are unavailable',
        });
      }

      if (!product.vendor_id) {
        return res.status(400).json({
          success: false,
          error: `${product.name} is not linked to a vendor`,
        });
      }

      if ((product.stock_quantity || 0) < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `${product.name} does not have enough stock`,
        });
      }

      const subtotal = Number(product.price) * item.quantity;
      total += subtotal;
      const primaryImage =
        product.product_images?.find((image) => image.is_primary)?.image_url
        || product.product_images?.[0]?.image_url
        || null;

      orderItems.push({
        product_id: product.id,
        vendor_id: product.vendor_id,
        product_name: product.name,
        product_image: primaryImage,
        price: product.price,
        quantity: item.quantity,
        subtotal,
        total: subtotal,
      });
    }

    const orderPayload = {
      user_id: req.user.id,
      status: 'pending',
      total,
      total_amount: total,
      subtotal: total,
      shipping_address,
      shipping_city,
      shipping_region,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      payment_method,
      payment_status: 'pending',
      order_number: buildOrderNumber(),
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    createdOrderId = order.id;

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemsError) {
      throw itemsError;
    }

    const payment = await initializeOrderPayment({ order, paymentMethod: payment_method });

    res.status(201).json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        authorization_url: payment.authorization_url,
        access_code: payment.access_code,
        reference: payment.reference,
      },
    });
  } catch (error) {
    console.error('Create checkout error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      error,
    });

    if (createdOrderId) {
      await supabaseAdmin.from('order_items').delete().eq('order_id', createdOrderId);
      await supabaseAdmin.from('orders').delete().eq('id', createdOrderId);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout',
    });
  }
};

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
        error: 'Invalid status',
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    await emailService.sendOrderStatusUpdate({ ...order, status }, status);

    res.json({
      success: true,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
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
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (req.profile?.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    if (req.profile?.role === 'vendor') {
      const vendorId = await getVendorIdForUser(req.user.id);
      const hasVendorItem = order.order_items?.some((item) => item.vendor_id === vendorId);

      if (!hasVendorItem) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
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

    if (req.profile?.role === 'vendor') {
      const authenticatedVendorId = await getVendorIdForUser(req.user.id);
      if (!authenticatedVendorId || authenticatedVendorId !== vendorId) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }
    }

    const { data: orderItems, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!orderItems?.length) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const orderIds = [...new Set(orderItems.map((item) => item.order_id))];
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, payment_status, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_region, created_at')
      .in('id', orderIds);

    if (ordersError) {
      throw ordersError;
    }

    const orderMap = {};
    ordersData?.forEach((order) => {
      orderMap[order.id] = order;
    });

    const groupedOrders = {};
    orderItems.forEach((item) => {
      const order = orderMap[item.order_id];
      if (!order) return;

      if (!groupedOrders[item.order_id]) {
        groupedOrders[item.order_id] = {
          ...order,
          items: [],
        };
      }

      groupedOrders[item.order_id].items.push(item);
    });

    res.json({
      success: true,
      data: Object.values(groupedOrders),
    });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor orders',
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

    if (req.profile?.role === 'vendor') {
      const authenticatedVendorId = await getVendorIdForUser(req.user.id);
      if (!authenticatedVendorId || authenticatedVendorId !== vendorId) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }
    }

    const { data: orderItems, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!orderItems?.length) {
      return res.json({
        success: true,
        totalSales: 0,
        orderCount: 0,
        recentOrders: [],
      });
    }

    const orderIds = [...new Set(orderItems.map((item) => item.order_id))];
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, payment_status, customer_name, created_at')
      .in('id', orderIds);

    if (ordersError) {
      throw ordersError;
    }

    const orderMap = {};
    ordersData?.forEach((order) => {
      orderMap[order.id] = order;
    });

    const groupedOrders = {};
    let totalSales = 0;

    orderItems.forEach((item) => {
      const order = orderMap[item.order_id];
      if (!order) return;

      if (!groupedOrders[item.order_id]) {
        groupedOrders[item.order_id] = {
          ...order,
          total: 0,
          items: [],
        };
      }

      groupedOrders[item.order_id].items.push(item);
      groupedOrders[item.order_id].total += getLineItemTotal(item);

      if (order.payment_status === 'paid') {
        totalSales += getLineItemTotal(item);
      }
    });

    const ordersArray = Object.values(groupedOrders);

    res.json({
      success: true,
      totalSales,
      orderCount: ordersArray.length,
      recentOrders: ordersArray.slice(0, 10),
    });
  } catch (error) {
    console.error('Get vendor order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor order stats',
    });
  }
};

/**
 * Get all orders (Admin only)
 * GET /api/orders
 */
export const getAllOrders = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: orders || [],
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders',
    });
  }
};

/**
 * Get admin statistics
 * GET /api/orders/admin/stats
 */
export const getAdminStats = async (req, res) => {
  try {
    const { count: orderCount } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { data: paidOrders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid');

    if (error) throw error;

    const totalRevenue = paidOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const platformCommission = totalRevenue * 0.05;

    res.json({
      success: true,
      totalOrders: orderCount || 0,
      totalRevenue,
      platformCommission,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin stats',
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
      items: allItems,
    });
  } catch (error) {
    console.error('Debug order items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order items',
    });
  }
};

export default {
  createCheckout,
  updateOrderStatus,
  getOrder,
  getVendorOrders,
  getVendorOrderStats,
  getAllOrders,
  getAdminStats,
  debugAllOrderItems,
};
