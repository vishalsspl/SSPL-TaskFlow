import express from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:projectId', getDashboard);

export default router;
