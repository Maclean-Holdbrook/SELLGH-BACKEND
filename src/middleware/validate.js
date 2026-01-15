/**
 * Validation middleware using Joi schemas
 *
 * Usage:
 * router.post('/products', validate(createProductSchema), createProduct);
 * router.get('/products/:id', validate(productIdSchema, 'params'), getProductById);
 */

/**
 * Create validation middleware
 * @param {Object} schema - Joi schema to validate against
 * @param {String} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    // Get the data to validate based on property
    const dataToValidate = req[property];

    // Validate the data
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types (e.g., string to number)
    });

    if (error) {
      // Extract error messages
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // For body, we can replace directly
    // For query/params, they're read-only getters so we just validate but don't replace
    if (property === 'body') {
      req[property] = value;
    }
    // For query/params, validation passes but we use original values
    // since they're already parsed by Express

    next();
  };
};

/**
 * Validate multiple properties at once
 * @param {Object} schemas - Object with schema for each property
 * @example
 * validateMultiple({
 *   body: createProductSchema,
 *   params: productIdSchema
 * })
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    // Validate each property
    for (const [property, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const propertyErrors = error.details.map(detail => ({
          property,
          field: detail.path.join('.'),
          message: detail.message,
        }));
        errors.push(...propertyErrors);
      } else {
        // Update with validated value (only for body)
        if (property === 'body') {
          req[property] = value;
        }
        // For query/params, just validate but don't replace
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
};
