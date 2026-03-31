import express from 'express';
import { getGlobalInvoices, updateInvoiceStatus, createInvoice } from '../controllers/billingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('SUPERADMIN'));

router.get('/invoices', getGlobalInvoices);
router.post('/invoices', createInvoice);
router.patch('/invoices/:id/status', updateInvoiceStatus);

export default router;
