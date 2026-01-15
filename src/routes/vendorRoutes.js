import express from 'express';
import {
  getVendorProfile,
  createVendorProfile,
  updateVendorProfile,
  getAllVendors,
  verifyVendor,
  createVendorSubaccount,
  getVendorSubaccount,
} from '../controllers/vendorController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createVendorSchema,
  updateVendorSchema,
  vendorIdSchema,
  userIdSchema,
  createSubaccountSchema,
} from '../validators/vendorValidator.js';

const router = express.Router();

// Public routes
router.get('/', getAllVendors);
router.get('/:userId', validate(userIdSchema, 'params'), getVendorProfile);

// Protected routes - vendor only
router.post('/', authenticate, authorize('vendor'), validate(createVendorSchema), createVendorProfile);
router.put('/profile', authenticate, authorize('vendor'), validate(updateVendorSchema), updateVendorProfile);

// Admin only routes - SECURITY FIX: Added authentication
router.put('/:vendorId/verify', authenticate, authorize('admin'), validate(vendorIdSchema, 'params'), verifyVendor);

// Paystack subaccount management - SECURITY FIX: Admin only
router.post('/:vendorId/subaccount', authenticate, authorize('admin'), validate(vendorIdSchema, 'params'), validate(createSubaccountSchema), createVendorSubaccount);
router.get('/:vendorId/subaccount', authenticate, authorize('admin'), validate(vendorIdSchema, 'params'), getVendorSubaccount);

export default router;
