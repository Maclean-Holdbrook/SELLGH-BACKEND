import Joi from 'joi';

/**
 * Vendor validation schemas
 */

// Create vendor profile validation
export const createVendorSchema = Joi.object({
  business_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'Business name is required',
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name must not exceed 200 characters',
    }),

  business_description: Joi.string()
    .min(20)
    .max(2000)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.min': 'Business description must be at least 20 characters',
      'string.max': 'Business description must not exceed 2000 characters',
    }),

  business_address: Joi.string()
    .min(10)
    .max(500)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.min': 'Business address must be at least 10 characters',
    }),

  business_phone: Joi.string()
    .pattern(/^[+]?[\d\s\-()]+$/)
    .min(10)
    .max(20)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
      'string.min': 'Phone number must be at least 10 characters',
    }),

  business_email: Joi.string()
    .email()
    .optional()
    .allow('', null)
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Invalid email format',
    }),

  bank_name: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .trim(),

  account_number: Joi.string()
    .pattern(/^\d+$/)
    .min(10)
    .max(20)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.pattern.base': 'Account number must contain only digits',
      'string.min': 'Account number must be at least 10 digits',
    }),

  account_name: Joi.string()
    .max(200)
    .optional()
    .allow('', null)
    .trim(),

  mobile_money_provider: Joi.string()
    .valid('MTN', 'VODAFONE', 'AIRTELTIGO', '')
    .optional()
    .allow('', null),

  mobile_money_number: Joi.string()
    .pattern(/^0\d{9}$/)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.pattern.base': 'Mobile money number must be 10 digits starting with 0',
    }),
});

// Update vendor profile validation
export const updateVendorSchema = Joi.object({
  business_name: Joi.string()
    .min(2)
    .max(200)
    .optional()
    .trim(),

  business_description: Joi.string()
    .min(20)
    .max(2000)
    .optional()
    .allow('', null)
    .trim(),

  business_address: Joi.string()
    .min(10)
    .max(500)
    .optional()
    .allow('', null)
    .trim(),

  business_phone: Joi.string()
    .pattern(/^[+]?[\d\s\-()]+$/)
    .min(10)
    .max(20)
    .optional()
    .allow('', null)
    .trim(),

  business_email: Joi.string()
    .email()
    .optional()
    .allow('', null)
    .trim()
    .lowercase(),

  bank_name: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .trim(),

  account_number: Joi.string()
    .pattern(/^\d+$/)
    .min(10)
    .max(20)
    .optional()
    .allow('', null)
    .trim(),

  account_name: Joi.string()
    .max(200)
    .optional()
    .allow('', null)
    .trim(),

  mobile_money_provider: Joi.string()
    .valid('MTN', 'VODAFONE', 'AIRTELTIGO', '')
    .optional()
    .allow('', null),

  mobile_money_number: Joi.string()
    .pattern(/^0\d{9}$/)
    .optional()
    .allow('', null)
    .trim(),
});

// Vendor ID parameter validation
export const vendorIdSchema = Joi.object({
  vendorId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid vendor ID format',
      'any.required': 'Vendor ID is required',
    }),
});

// User ID parameter validation
export const userIdSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
});

// Subaccount creation validation
export const createSubaccountSchema = Joi.object({
  business_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .trim(),

  settlement_bank: Joi.string()
    .required()
    .trim(),

  account_number: Joi.string()
    .pattern(/^\d+$/)
    .min(10)
    .max(20)
    .required()
    .trim(),

  percentage_charge: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .default(5),
});
