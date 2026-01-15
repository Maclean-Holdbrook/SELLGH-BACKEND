import Joi from 'joi';

/**
 * Product validation schemas
 */

// Create product validation
export const createProductSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name must be at least 3 characters',
      'string.max': 'Product name must not exceed 200 characters',
    }),

  description: Joi.string()
    .min(10)
    .max(5000)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 5000 characters',
    }),

  price: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be a positive number',
      'any.required': 'Price is required',
    }),

  compare_at_price: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .allow(null)
    .messages({
      'number.positive': 'Compare at price must be a positive number',
    }),

  stock_quantity: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.integer': 'Stock quantity must be a whole number',
      'number.min': 'Stock quantity cannot be negative',
    }),

  sku: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .trim(),

  category_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Category ID must be a valid UUID',
    }),

  is_featured: Joi.boolean()
    .optional()
    .default(false),
});

// Update product validation (same as create but all fields optional)
export const updateProductSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.min': 'Product name must be at least 3 characters',
      'string.max': 'Product name must not exceed 200 characters',
    }),

  description: Joi.string()
    .min(10)
    .max(5000)
    .optional()
    .allow('', null)
    .trim(),

  price: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Price must be a positive number',
    }),

  compare_at_price: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .allow(null),

  stock_quantity: Joi.number()
    .integer()
    .min(0)
    .optional(),

  sku: Joi.string()
    .max(100)
    .optional()
    .allow('', null),

  category_id: Joi.string()
    .uuid()
    .optional()
    .allow(null),

  is_featured: Joi.boolean()
    .optional(),

  is_active: Joi.boolean()
    .optional(),
});

// Product query params validation
export const productQuerySchema = Joi.object({
  category: Joi.string()
    .uuid()
    .optional(),

  vendor: Joi.string()
    .uuid()
    .optional(),

  search: Joi.string()
    .max(200)
    .optional()
    .trim(),

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

  sort: Joi.string()
    .valid('price_asc', 'price_desc', 'newest', 'popular')
    .optional()
    .default('newest'),
});

// UUID parameter validation
export const productIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid product ID format',
      'any.required': 'Product ID is required',
    }),
});
