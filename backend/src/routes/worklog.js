import express from 'express';
import {
    getWorklogs,
    addWorklog,
    updateWorklog,
    deleteWorklog
} from '../controllers/worklogController.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(attachTenantDb);

router.get('/', getWorklogs);
router.post('/', addWorklog);
router.put('/:id', updateWorklog);
router.delete('/:id', deleteWorklog);

export default router;
