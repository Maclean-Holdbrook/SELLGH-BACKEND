import Joi from 'joi';

/**
 * Order validation schemas
 */

// Update order status validation
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled',
      'any.required': 'Status is required',
    }),

  tracking_number: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .trim(),

  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('', null)
    .trim(),
});

// Order ID parameter validation
export const orderIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid order ID format',
      'any.required': 'Order ID is required',
    }),
});

// Vendor ID parameter validation
export const vendorIdParamSchema = Joi.object({
  vendorId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid vendor ID format',
      'any.required': 'Vendor ID is required',
    }),
});

// Order query params validation
export const orderQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    .optional(),

  vendor_id: Joi.string()
    .uuid()
    .optional(),

  customer_id: Joi.string()
    .uuid()
    .optional(),

  from_date: Joi.date()
    .iso()
    .optional(),

  to_date: Joi.date()
    .iso()
    .min(Joi.ref('from_date'))
    .optional()
    .messages({
      'date.min': 'To date must be after from date',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20),

  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
});
