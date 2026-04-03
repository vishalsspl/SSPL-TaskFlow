import express from 'express';
import { getChatHistory, getChatRooms } from '../controllers/chat.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('chat'));
router.use(attachTenantDb);

router.get('/history', getChatHistory);
router.get('/rooms', getChatRooms);

export default router;
