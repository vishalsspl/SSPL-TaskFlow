import express from 'express';
import { updateOrganization } from '../controllers/organizationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.patch('/', updateOrganization);

export default router;
