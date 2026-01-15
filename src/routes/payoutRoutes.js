import express from 'express';
import {
  getVendorCommissions,
  getVendorPayouts,
  getAllCommissions,
  getAllPayouts,
  createVendorPayout,
  updatePayoutStatus,
  getPayoutStats,
  getPlatformWithdrawals,
  createPlatformWithdrawal,
  updateWithdrawalStatus,
  getPlatformBalance,
  requestVendorPayout
} from '../controllers/payoutController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Vendor routes - require authentication and vendor role
router.get('/commissions', authenticate, authorize('vendor'), getVendorCommissions);
router.get('/history', authenticate, authorize('vendor'), getVendorPayouts);
router.post('/vendor/request', authenticate, authorize('vendor'), requestVendorPayout);

// Admin routes - require authentication and admin role
router.get('/admin/commissions', authenticate, authorize('admin'), getAllCommissions);
router.get('/admin/payouts', authenticate, authorize('admin'), getAllPayouts);
router.post('/admin/payouts', authenticate, authorize('admin'), createVendorPayout);
router.patch('/admin/payouts/:payout_id', authenticate, authorize('admin'), updatePayoutStatus);
router.get('/admin/stats', authenticate, authorize('admin'), getPayoutStats);

// Platform withdrawal routes (admin only)
router.get('/admin/withdrawals', authenticate, authorize('admin'), getPlatformWithdrawals);
router.post('/admin/withdrawals', authenticate, authorize('admin'), createPlatformWithdrawal);
router.patch('/admin/withdrawals/:withdrawal_id', authenticate, authorize('admin'), updateWithdrawalStatus);
router.get('/admin/balance', authenticate, authorize('admin'), getPlatformBalance);

export default router;
// Force reload now
