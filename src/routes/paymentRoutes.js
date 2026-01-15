import express from 'express';
import {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentStatus
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  initializePaymentSchema,
  paymentReferenceSchema,
  orderIdSchema,
  webhookSchema,
} from '../validators/paymentValidator.js';

const router = express.Router();

// Initialize payment - SECURITY FIX: Requires authentication
router.post('/initialize', authenticate, validate(initializePaymentSchema), initializePayment);

// Verify payment - No auth required (called via Paystack redirect)
// Security: Payment reference is verified with Paystack directly
router.get('/verify/:reference', validate(paymentReferenceSchema, 'params'), verifyPayment);

// Paystack webhook (no auth required - verified via signature)
router.post('/webhook', validate(webhookSchema), handleWebhook);

// Get payment status - SECURITY FIX: Requires authentication
router.get('/status/:order_id', authenticate, validate(orderIdSchema, 'params'), getPaymentStatus);

export default router;
