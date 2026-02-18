import express from 'express';
import { login, signup, invite, me } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/invite', authenticate, authorize('ADMIN', 'MANAGER'), invite);
router.get('/me', authenticate, me);

export default router;
