import express from 'express';
import { updateOrganization, getPublicOrganization } from '../controllers/organizationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', getPublicOrganization);
router.patch('/', authenticate, updateOrganization);

export default router;
