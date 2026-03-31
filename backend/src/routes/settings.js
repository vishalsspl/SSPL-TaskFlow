import express from 'express';
import { getPlatformSettings, updatePlatformSettings } from '../controllers/settingsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('SUPERADMIN'));

router.get('/', getPlatformSettings);
router.put('/', updatePlatformSettings);

export default router;
