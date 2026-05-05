import express from 'express';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getBillingHistory,
  getCurrentPlan,
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Webhook (no auth — Razorpay calls this directly) ────────────────────────
// Must be BEFORE authenticate middleware
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// ── Authenticated routes ────────────────────────────────────────────────────
router.use(authenticate);

// Any authenticated user can view current plan
router.get('/current-plan', getCurrentPlan);

// Admin-only routes
router.post('/create-order', authorize('ADMIN'), createOrder);
router.post('/verify-payment', authorize('ADMIN'), verifyPayment);
router.get('/history', authorize('ADMIN'), getBillingHistory);

export default router;
