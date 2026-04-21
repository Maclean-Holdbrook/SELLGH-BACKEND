import { supabaseAdmin } from '../config/supabase.js';
import paystackService from '../services/paystackService.js';
import emailService from '../services/emailService.js';
import crypto from 'crypto';
import { getLineItemTotal } from '../utils/schemaContract.js';

const createReference = (orderNumber) => `PAY-${orderNumber}-${Date.now()}`;

const groupItemsByVendor = (orderItems) => {
  const vendorItems = {};

  for (const item of orderItems || []) {
    if (!item.vendor_id) {
      console.warn('Order item missing vendor_id:', item);
      continue;
    }

    if (!vendorItems[item.vendor_id]) {
      vendorItems[item.vendor_id] = [];
    }

    vendorItems[item.vendor_id].push(item);
  }

  return vendorItems;
};

const updateTransactionStatus = async (reference, payload) => {
  try {
    await supabaseAdmin
      .from('transactions')
      .update(payload)
      .eq('reference', reference);
  } catch (txError) {
    console.warn('Transaction update skipped (table may not exist):', txError.message);
  }
};

const finalizeSuccessfulPayment = async (order, paymentData, { sendEmails = false } = {}) => {
  if (order.payment_status === 'paid') {
    return order;
  }

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'processing',
    })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  await updateTransactionStatus(order.payment_reference, {
    status: 'success',
    paid_at: paymentData.paid_at || new Date().toISOString(),
    channel: paymentData.channel || null,
    gateway_response: paymentData.gateway_response || 'Successful',
  });

  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (orderItemsError) {
    throw orderItemsError;
  }

  for (const item of orderItems || []) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .maybeSingle();

    if (product) {
      await supabaseAdmin
        .from('products')
        .update({ stock_quantity: Math.max(0, (product.stock_quantity || 0) - item.quantity) })
        .eq('id', item.product_id);
    }
  }

  const vendorItems = groupItemsByVendor(orderItems);

  for (const [vendorId, items] of Object.entries(vendorItems)) {
    const vendorTotal = items.reduce((sum, item) => sum + getLineItemTotal(item), 0);
    const platformCommission = vendorTotal * 0.05;
    const vendorAmount = vendorTotal * 0.95;

    const { data: existingCommission } = await supabaseAdmin
      .from('commissions')
      .select('id')
      .eq('order_id', order.id)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (!existingCommission) {
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
            payment_reference: order.payment_reference,
            payment_method: paymentData.channel || order.payment_method || 'card',
          });
      } catch (commError) {
        console.warn('Commission record not created:', commError.message);
      }
    }

    if (sendEmails) {
      const { data: vendor } = await supabaseAdmin
        .from('vendors')
        .select('business_email')
        .eq('id', vendorId)
        .maybeSingle();

      if (vendor?.business_email) {
        await emailService.sendVendorOrderNotification(vendor.business_email, updatedOrder, items);
      }
    }
  }

  if (sendEmails) {
    await emailService.sendOrderConfirmation(updatedOrder, orderItems || []);
  }

  return updatedOrder;
};

/**
 * Initialize payment transaction
 * POST /api/payments/initialize
 */
export const initializePayment = async (req, res) => {
  try {
    const { order_id, email, amount, payment_method } = req.body;

    if (!order_id || !email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_id, email, amount',
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.user_id !== req.user.id && req.profile?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    if (Number(order.total_amount).toFixed(2) !== Number(amount).toFixed(2)) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount does not match the order total',
      });
    }

    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('vendor_id, total, subtotal')
      .eq('order_id', order_id);

    if (orderItemsError) {
      throw orderItemsError;
    }

    const reference = createReference(order.order_number);
    const frontendUrl = process.env.FRONTEND_URL || 'https://sellgh.vercel.app';
    const callbackUrl = `${frontendUrl}/payment/verify?reference=${reference}`;

    const paymentData = {
      email,
      amount: Math.round(amount * 100),
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        payment_method,
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
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_reference: reference,
        payment_method,
      })
      .eq('id', order_id);

    try {
      await supabaseAdmin
        .from('transactions')
        .insert({
          order_id,
          reference,
          amount,
          payment_method,
          status: 'pending',
          provider: 'paystack',
        });
    } catch (txError) {
      console.warn('Transaction record not created (table may not exist):', txError.message);
    }

    res.json({
      success: true,
      data: {
        authorization_url: result.data.authorization_url,
        access_code: result.data.access_code,
        reference: result.data.reference,
      },
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment',
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

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required',
      });
    }

    const result = await paystackService.verifyTransaction(reference);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    const paymentData = result.data;
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_reference', reference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found for this payment reference',
      });
    }

    if (paymentData.status === 'success') {
      await finalizeSuccessfulPayment(order, paymentData);
    } else {
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', order.id);

      await updateTransactionStatus(reference, {
        status: 'failed',
        gateway_response: paymentData.gateway_response,
      });
    }

    res.json({
      success: true,
      data: {
        status: paymentData.status,
        order_id: order.id,
        order_number: order.order_number,
        amount: paymentData.amount / 100,
        paid_at: paymentData.paid_at,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
};

/**
 * Paystack webhook handler
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

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

const handleChargeSuccess = async (data) => {
  const { reference } = data;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('payment_reference', reference)
    .single();

  if (error || !order) {
    console.error('Order not found for webhook:', reference);
    return;
  }

  await finalizeSuccessfulPayment(order, data, { sendEmails: true });
};

const handleChargeFailed = async (data) => {
  const { reference, gateway_response } = data;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('payment_reference', reference)
    .single();

  if (error || !order) {
    console.error('Order not found for failed webhook:', reference);
    return;
  }

  await supabaseAdmin
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', order.id);

  await updateTransactionStatus(reference, {
    status: 'failed',
    gateway_response,
  });
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
      .select('id, user_id, order_number, payment_status, payment_method, payment_reference')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.user_id !== req.user.id && req.profile?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('order_id', order_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        transaction: transaction || null,
      },
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
    });
  }
};

export default {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
};
