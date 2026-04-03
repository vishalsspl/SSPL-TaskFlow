import express from 'express';
import {
    getPerformanceStats,
    getUserPerformance,
    getProjectPerformance
} from '../controllers/performanceController.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('performance'));
router.use(attachTenantDb);

router.get('/statistics', getPerformanceStats);
router.get('/user/:userId', getUserPerformance);
router.get('/project/:projectId', getProjectPerformance);

export default router;
