import express from 'express';
import { exportToPDF, exportToPNG, generateReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:projectId/generate', generateReport);
router.post('/:projectId/pdf', exportToPDF);
router.post('/:projectId/png', exportToPNG);

export default router;
