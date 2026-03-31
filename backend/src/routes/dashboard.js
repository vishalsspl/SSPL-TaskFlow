import express from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(attachTenantDb);

router.get('/:projectId', getDashboard);

export default router;
