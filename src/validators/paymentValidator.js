import Joi from 'joi';

/**
 * Payment validation schemas
 */

// Initialize payment validation
export const initializePaymentSchema = Joi.object({
  order_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid order ID format',
      'any.required': 'Order ID is required',
    }),

  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),

  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required',
    }),

  currency: Joi.string()
    .valid('GHS', 'USD', 'NGN')
    .optional()
    .default('GHS')
    .uppercase(),

  payment_method: Joi.string()
    .valid('card', 'mobile_money')
    .required()
    .messages({
      'any.only': 'Payment method must be either card or mobile_money',
      'any.required': 'Payment method is required',
    }),

  mobile_money_provider: Joi.string()
    .valid('MTN', 'VODAFONE', 'AIRTELTIGO')
    .when('payment_method', {
      is: 'mobile_money',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
    })
    .messages({
      'any.only': 'Mobile money provider must be MTN, VODAFONE, or AIRTELTIGO',
    }),

  mobile_money_number: Joi.string()
    .pattern(/^0\d{9}$/)
    .when('payment_method', {
      is: 'mobile_money',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
    })
    .messages({
      'string.pattern.base': 'Mobile money number must be 10 digits starting with 0',
    }),

  cart_items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string()
          .uuid()
          .required(),
        vendor_id: Joi.string()
          .uuid()
          .required(),
        quantity: Joi.number()
          .integer()
          .min(1)
          .required(),
        price: Joi.number()
          .positive()
          .precision(2)
          .required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Cart must contain at least one item',
      'any.required': 'Cart items are required',
    }),

  shipping_address: Joi.object({
    full_name: Joi.string()
      .min(2)
      .max(200)
      .required()
      .trim(),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-()]+$/)
      .min(10)
      .max(20)
      .required()
      .trim(),
    address_line1: Joi.string()
      .min(5)
      .max(200)
      .required()
      .trim(),
    address_line2: Joi.string()
      .max(200)
      .optional()
      .allow('', null)
      .trim(),
    city: Joi.string()
      .min(2)
      .max(100)
      .required()
      .trim(),
    region: Joi.string()
      .min(2)
      .max(100)
      .required()
      .trim(),
    country: Joi.string()
      .length(2)
      .optional()
      .default('GH')
      .uppercase(),
  }).required(),

  metadata: Joi.object()
    .optional()
    .allow(null),
});

// Payment reference validation
export const paymentReferenceSchema = Joi.object({
  reference: Joi.string()
    .pattern(/^[A-Za-z0-9\-]+$/)
    .min(10)
    .max(100)
    .required()
    .messages({
      'string.pattern.base': 'Invalid payment reference format',
      'any.required': 'Payment reference is required',
    }),
});

// Order ID validation
export const orderIdSchema = Joi.object({
  order_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid order ID format',
      'any.required': 'Order ID is required',
    }),
});

// Webhook validation (basic structure)
export const webhookSchema = Joi.object({
  event: Joi.string()
    .required(),

  data: Joi.object()
    .required(),
}).unknown(true); // Allow additional fields from Paystack
