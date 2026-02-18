import express from 'express';
import { exportToPDF, exportToPNG } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/:projectId/pdf', exportToPDF);
router.post('/:projectId/png', exportToPNG);

export default router;
