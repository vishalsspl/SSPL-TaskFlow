import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(attachTenantDb);
// Only ADMIN can manage roles in this implementation
router.use(authorize('ADMIN'));

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
