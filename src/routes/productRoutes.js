import express from 'express';
import {
  getAllProducts,
  getProductById,
  getVendorProducts,
  getProductsByUserId,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getCategories,
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productIdSchema,
} from '../validators/productValidator.js';
import { userIdSchema } from '../validators/vendorValidator.js';

const router = express.Router();

// Public routes
router.get('/', validate(productQuerySchema, 'query'), getAllProducts);
router.get('/categories', getCategories);
router.get('/user/:userId', validate(userIdSchema, 'params'), getProductsByUserId);
router.get('/:id', validate(productIdSchema, 'params'), getProductById);

// Vendor routes
router.get('/vendor/my-products', authenticate, authorize('vendor'), getVendorProducts);
router.post('/', authenticate, authorize('vendor'), validate(createProductSchema), createProduct);
router.put('/:id', authenticate, authorize('vendor'), validate(productIdSchema, 'params'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, authorize('vendor'), validate(productIdSchema, 'params'), deleteProduct);
router.patch('/:id/toggle-status', authenticate, authorize('vendor'), validate(productIdSchema, 'params'), toggleProductStatus);

export default router;
