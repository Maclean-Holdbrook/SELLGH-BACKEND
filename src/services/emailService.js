import { Resend } from 'resend';
import { getLineItemTotal } from '../utils/schemaContract.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'SellGH <onboarding@resend.dev>';
const formatAmount = (amount) => Number(amount || 0).toFixed(2);

// Check if email service is configured
const isConfigured = () => {
  if (!resend) {
    console.log('Email service not configured - RESEND_API_KEY missing');
    return false;
  }
  return true;
};

/**
 * Send order confirmation email to customer
 */
export const sendOrderConfirmation = async (order, orderItems) => {
  if (!isConfigured()) return { success: false, error: 'Email service not configured' };

  try {
    const itemsHtml = orderItems.map((item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${item.product_name}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          GH₵ ${formatAmount(getLineItemTotal(item))}
        </td>
      </tr>
    `).join('');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `Order Confirmed - ${order.order_number}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">SellGH</h1>
            <p style="color: #666; margin-top: 5px;">Thank you for your order!</p>
          </div>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #1f2937;">Order Confirmed</h2>
            <p style="margin-bottom: 5px;"><strong>Order Number:</strong> ${order.order_number}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style="margin-bottom: 0;"><strong>Payment Status:</strong> <span style="color: ${order.payment_status === 'paid' ? '#10b981' : '#f59e0b'};">${order.payment_status === 'paid' ? 'Paid' : 'Pending'}</span></p>
          </div>

          <h3 style="color: #1f2937;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #4F46E5;">GH₵ ${formatAmount(order.total_amount ?? order.total ?? order.subtotal)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #1f2937;">Shipping Address</h3>
            <p style="margin: 0;">
              ${order.customer_name}<br>
              ${order.shipping_address}<br>
              ${order.shipping_city}, ${order.shipping_region}<br>
              ${order.customer_phone}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              You can track your order status at any time by visiting your orders page.
            </p>
            <a href="${process.env.FRONTEND_URL}/order/${order.id}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
              View Order
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} SellGH. All rights reserved.</p>
            <p>Sell anything, reach everyone.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending order confirmation:', error);
      return { success: false, error };
    }

    console.log('Order confirmation sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
};

/**
 * Send order status update email
 */
export const sendOrderStatusUpdate = async (order, newStatus) => {
  if (!isConfigured()) return { success: false, error: 'Email service not configured' };

  try {
    const statusMessages = {
      confirmed: {
        title: 'Order Confirmed',
        message: 'Your order has been confirmed and is being prepared.',
        color: '#3b82f6',
      },
      processing: {
        title: 'Order Processing',
        message: 'Your order is now being processed by the vendor.',
        color: '#8b5cf6',
      },
      shipped: {
        title: 'Order Shipped',
        message: 'Great news! Your order has been shipped and is on its way.',
        color: '#6366f1',
      },
      delivered: {
        title: 'Order Delivered',
        message: 'Your order has been delivered. We hope you enjoy your purchase!',
        color: '#10b981',
      },
      cancelled: {
        title: 'Order Cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact support.',
        color: '#ef4444',
      },
    };

    const statusInfo = statusMessages[newStatus] || {
      title: 'Order Update',
      message: `Your order status has been updated to: ${newStatus}`,
      color: '#6b7280',
    };

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `${statusInfo.title} - ${order.order_number}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">SellGH</h1>
          </div>

          <div style="background: ${statusInfo.color}; color: white; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">${statusInfo.title}</h2>
          </div>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; font-size: 16px;">${statusInfo.message}</p>
            <p style="margin: 0;"><strong>Order Number:</strong> ${order.order_number}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/order/${order.id}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Track Your Order
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} SellGH. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending status update:', error);
      return { success: false, error };
    }

    console.log('Status update email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
};

/**
 * Send vendor new order notification
 */
export const sendVendorOrderNotification = async (vendorEmail, order, vendorItems) => {
  if (!isConfigured()) return { success: false, error: 'Email service not configured' };

  try {
    const itemsHtml = vendorItems.map((item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">GH₵ ${formatAmount(getLineItemTotal(item))}</td>
      </tr>
    `).join('');

    const vendorTotal = vendorItems.reduce((sum, item) => sum + getLineItemTotal(item), 0);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: vendorEmail,
      subject: `New Order Received - ${order.order_number}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">SellGH</h1>
            <p style="color: #666; margin-top: 5px;">Vendor Notification</p>
          </div>

          <div style="background: #10b981; color: white; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">New Order Received!</h2>
          </div>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin-bottom: 5px;"><strong>Order Number:</strong> ${order.order_number}</p>
            <p style="margin-bottom: 5px;"><strong>Customer:</strong> ${order.customer_name}</p>
            <p style="margin-bottom: 0;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
          </div>

          <h3 style="color: #1f2937;">Your Items in This Order</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Your Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #10b981;">GH₵ ${formatAmount(vendorTotal)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #92400e;">Shipping Details</h3>
            <p style="margin: 0;">
              ${order.customer_name}<br>
              ${order.shipping_address}<br>
              ${order.shipping_city}, ${order.shipping_region}<br>
              Phone: ${order.customer_phone}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/vendor/orders" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Manage Orders
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} SellGH. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending vendor notification:', error);
      return { success: false, error };
    }

    console.log('Vendor notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
};

export default {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendVendorOrderNotification,
};
