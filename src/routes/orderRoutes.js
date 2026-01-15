import express from 'express';
import {
  updateOrderStatus,
  getOrder,
  getVendorOrders,
  getVendorOrderStats,
  getAllOrders,
  getAdminStats,
  debugAllOrderItems
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  updateOrderStatusSchema,
  orderIdSchema,
  vendorIdParamSchema,
  orderQuerySchema,
} from '../validators/orderValidator.js';

const router = express.Router();

// ALL static/specific routes MUST come BEFORE parameterized routes like /:id
// Otherwise Express will match /:id first and treat "debug", "stats", etc as IDs

// Admin-only debug endpoints
router.get('/debug/all-items', authenticate, authorize('admin'), debugAllOrderItems);
router.get('/debug/all-orders', authenticate, authorize('admin'), validate(orderQuerySchema, 'query'), getAllOrders);
router.get('/debug/stats', authenticate, authorize('admin'), getAdminStats);

// Vendor-specific routes
router.get('/vendor/:vendorId/stats', authenticate, authorize('vendor', 'admin'), validate(vendorIdParamSchema, 'params'), getVendorOrderStats);
router.get('/vendor/:vendorId', authenticate, authorize('vendor', 'admin'), validate(vendorIdParamSchema, 'params'), validate(orderQuerySchema, 'query'), getVendorOrders);

// Update order status - vendor or admin only
router.put('/:id/status', authenticate, authorize('vendor', 'admin'), validate(orderIdSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);

// Get single order - authenticated users only
router.get('/:id', authenticate, validate(orderIdSchema, 'params'), getOrder);

export default router;

