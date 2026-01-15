import { supabaseAdmin } from '../config/supabase.js';
import paystackService from '../services/paystackService.js';
import emailService from '../services/emailService.js';
import crypto from 'crypto';

/**
 * Initialize payment transaction
 * POST /api/payments/initialize
 */
export const initializePayment = async (req, res) => {
  try {
    const { order_id, email, amount, payment_method, phone, provider } = req.body;

    // Validate required fields
    if (!order_id || !email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_id, email, amount'
      });
    }

    // Get order details with order items
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get order items to determine vendors
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('vendor_id, subtotal')
      .eq('order_id', order_id);

    // Generate unique reference
    const reference = `PAY-${order.order_number}-${Date.now()}`;

    // Initialize Paystack transaction
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const callbackUrl = `${frontendUrl}/payment/verify?reference=${reference}`;

    console.log('🔄 Initializing payment with callback URL:', callbackUrl);

    const paymentData = {
      email,
      amount: Math.round(amount * 100), // Convert GHS to pesewas
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        payment_method,
        custom_fields: [
          {
            display_name: "Order Number",
            variable_name: "order_number",
            value: order.order_number
          },
          {
            display_name: "Customer",
            variable_name: "customer_name",
            value: order.customer_name
          }
        ]
      }
    };

    // Add split payment configuration for multi-vendor orders
    // Get vendor subaccounts for split payment
    if (orderItems && orderItems.length > 0) {
      const vendorSubaccounts = [];

      // Group items by vendor and get their subaccount info
      const vendorAmounts = {};
      for (const item of orderItems) {
        if (!vendorAmounts[item.vendor_id]) {
          vendorAmounts[item.vendor_id] = 0;
        }
        vendorAmounts[item.vendor_id] += item.subtotal;
      }

      // Fetch vendor subaccount codes
      for (const vendorId of Object.keys(vendorAmounts)) {
        const { data: vendor } = await supabaseAdmin
          .from('vendors')
          .select('paystack_subaccount_code')
          .eq('id', vendorId)
          .single();

        if (vendor?.paystack_subaccount_code) {
          const vendorAmount = vendorAmounts[vendorId];
          // Vendor gets 95% of their portion
          const vendorShare = Math.round(vendorAmount * 0.95 * 100); // in pesewas

          vendorSubaccounts.push({
            subaccount: vendor.paystack_subaccount_code,
            share: vendorShare
          });
        }
      }

      // Add split payment configuration if we have subaccounts
      if (vendorSubaccounts.length > 0) {
        paymentData.subaccount = vendorSubaccounts[0].subaccount; // Primary subaccount
        // For multiple vendors, Paystack requires split array
        if (vendorSubaccounts.length > 1) {
          paymentData.split = vendorSubaccounts;
        }
      }
    }

    const result = await paystackService.initializeTransaction(paymentData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Update order with payment reference
    await supabaseAdmin
      .from('orders')
      .update({
        payment_reference: reference,
        payment_method: payment_method
      })
      .eq('id', order_id);

    // Create transaction record (optional - table may not exist yet)
    try {
      await supabaseAdmin
        .from('transactions')
        .insert({
          order_id,
          reference,
          amount,
          payment_method,
          status: 'pending',
          provider: 'paystack'
        });
    } catch (txError) {
      console.warn('Transaction record not created (table may not exist):', txError.message);
      // Continue anyway - transaction tracking is optional
    }

    res.json({
      success: true,
      data: {
        authorization_url: result.data.authorization_url,
        access_code: result.data.access_code,
        reference: result.data.reference
      }
    });

  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment'
    });
  }
};

/**
 * Verify payment transaction
 * GET /api/payments/verify/:reference
 */
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    console.log('💳 Verifying payment for reference:', reference);

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required'
      });
    }

    // Verify with Paystack
    const result = await paystackService.verifyTransaction(reference);

    console.log('💳 Paystack verification result:', result);

    if (!result.success) {
      console.log('❌ Payment verification failed:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    const paymentData = result.data;
    console.log('💳 Payment data status:', paymentData.status);

    // Get order by reference
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_reference', reference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found for this payment reference'
      });
    }

    // Update order based on payment status
    if (paymentData.status === 'success') {
      console.log('✅ Payment successful! Updating order:', order.id);
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing'
        })
        .eq('id', order.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to update order:', updateError);
        throw updateError;
      }

      console.log('✅ Order updated to paid status:', updateData);

      // Update transaction record (if table exists)
      try {
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'success',
            paid_at: new Date().toISOString(),
            gateway_response: paymentData.gateway_response
          })
          .eq('reference', reference);
      } catch (txError) {
        console.warn('Transaction update skipped (table may not exist):', txError.message);
      }

      // Update product stock and create commissions
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (orderItems) {
        for (const item of orderItems) {
          // Update stock directly instead of using RPC
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabaseAdmin
              .from('products')
              .update({ stock: Math.max(0, product.stock - item.quantity) })
              .eq('id', item.product_id);
          }
        }

        // Create commission records for vendors
        console.log('💰 Creating commission records...');
        const vendorItems = {};
        for (const item of orderItems) {
          // Skip items without vendor_id
          if (!item.vendor_id) {
            console.warn('⚠️ Order item missing vendor_id:', item);
            continue;
          }
          if (!vendorItems[item.vendor_id]) {
            vendorItems[item.vendor_id] = [];
          }
          vendorItems[item.vendor_id].push(item);
        }

        // Create commission record for each vendor
        for (const [vendorId, items] of Object.entries(vendorItems)) {
          const vendorTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
          const platformCommission = vendorTotal * 0.05; // 5%
          const vendorAmount = vendorTotal * 0.95; // 95%

          console.log(`💰 Creating commission for vendor ${vendorId}:`, {
            vendorTotal,
            platformCommission,
            vendorAmount
          });

          try {
            await supabaseAdmin
              .from('commissions')
              .insert({
                order_id: order.id,
                vendor_id: vendorId,
                order_total: vendorTotal,
                vendor_amount: vendorAmount,
                platform_commission: platformCommission,
                status: 'pending',
                payment_reference: reference,
                payment_method: paymentData.channel || 'card'
              });
            console.log(`✅ Commission created for vendor ${vendorId}: GHS ${platformCommission.toFixed(2)}`);
          } catch (commError) {
            console.error('❌ Failed to create commission:', commError);
          }
        }
      }
    } else {
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', order.id);

      try {
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'failed',
            gateway_response: paymentData.gateway_response
          })
          .eq('reference', reference);
      } catch (txError) {
        console.warn('Transaction update skipped (table may not exist):', txError.message);
      }
    }

    res.json({
      success: true,
      data: {
        status: paymentData.status,
        order_id: order.id,
        order_number: order.order_number,
        amount: paymentData.amount / 100, // Convert back to GHS
        paid_at: paymentData.paid_at
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
};

/**
 * Paystack webhook handler
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      default:
        console.log('Unhandled event type:', event.event);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

/**
 * Handle successful charge
 */
const handleChargeSuccess = async (data) => {
  const { reference, amount, paid_at, channel } = data;

  // Get order by reference
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('payment_reference', reference)
    .single();

  if (error || !order) {
    console.error('Order not found for webhook:', reference);
    return;
  }

  // Update order status
  await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'confirmed'
    })
    .eq('id', order.id);

  // Update transaction (if table exists)
  try {
    await supabaseAdmin
      .from('transactions')
      .update({
        status: 'success',
        paid_at,
        channel,
        gateway_response: 'Successful'
      })
      .eq('reference', reference);
  } catch (txError) {
    console.warn('Transaction update skipped (table may not exist):', txError.message);
  }

  // Fetch order items for stock update and emails
  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  // Update stock
  if (orderItems) {
    for (const item of orderItems) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (product) {
        await supabaseAdmin
          .from('products')
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq('id', item.product_id);
      }
    }
  }

  // Send order confirmation email to customer
  await emailService.sendOrderConfirmation(order, orderItems || []);

  // Send notifications to vendors and track commissions
  const vendorItems = {};
  for (const item of orderItems || []) {
    // Skip items without vendor_id
    if (!item.vendor_id) {
      console.warn('⚠️ Order item missing vendor_id:', item);
      continue;
    }
    if (!vendorItems[item.vendor_id]) {
      vendorItems[item.vendor_id] = [];
    }
    vendorItems[item.vendor_id].push(item);
  }

  // Create commission records for each vendor
  for (const [vendorId, items] of Object.entries(vendorItems)) {
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('email')
      .eq('id', vendorId)
      .single();

    // Calculate vendor's portion of the order
    const vendorTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const platformCommission = vendorTotal * 0.05; // 5%
    const vendorAmount = vendorTotal * 0.95; // 95%

    // Create commission record
    try {
      await supabaseAdmin
        .from('commissions')
        .insert({
          order_id: order.id,
          vendor_id: vendorId,
          order_total: vendorTotal,
          vendor_amount: vendorAmount,
          platform_commission: platformCommission,
          status: 'pending', // Will be 'settled' when vendor is paid
          payment_reference: reference,
          payment_method: channel || 'card'
        });
    } catch (commError) {
      console.warn('Commission record not created (table may not exist):', commError.message);
    }

    // Send vendor notification
    if (vendor?.email) {
      await emailService.sendVendorOrderNotification(vendor.email, order, items);
    }
  }

  console.log('Payment successful for order:', order.order_number);
};

/**
 * Handle failed charge
 */
const handleChargeFailed = async (data) => {
  const { reference, gateway_response } = data;

  // Get order by reference
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('payment_reference', reference)
    .single();

  if (error || !order) {
    console.error('Order not found for failed webhook:', reference);
    return;
  }

  // Update order status
  await supabaseAdmin
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', order.id);

  // Update transaction
  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'failed',
      gateway_response
    })
    .eq('reference', reference);

  console.log('Payment failed for reference:', reference);
};

/**
 * Get payment status
 * GET /api/payments/status/:order_id
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { order_id } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, payment_status, payment_method, payment_reference')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get transaction details if exists
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('order_id', order_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        transaction: transaction || null
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status'
    });
  }
};

export default {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentStatus
};
