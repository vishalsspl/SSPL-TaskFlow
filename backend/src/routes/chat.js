import express from 'express';
import { getChatHistory, getChatRooms } from '../controllers/chat.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(attachTenantDb);

router.get('/history', getChatHistory);
router.get('/rooms', getChatRooms);

export default router;
