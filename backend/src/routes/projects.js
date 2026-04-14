import express from 'express';
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  bulkCreateProjects,
} from '../controllers/projectController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('projects'));
router.use(attachTenantDb);

router.get('/', getAllProjects);
router.get('/:id', getProject);
router.post('/', authorize('ADMIN', 'MANAGER'), createProject);
router.post('/bulk-create', authorize('ADMIN', 'MANAGER'), bulkCreateProjects);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateProject);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteProject);
router.post('/:id/members', authorize('ADMIN', 'MANAGER'), addProjectMember);
router.delete('/:id/members/:userId', authorize('ADMIN', 'MANAGER'), removeProjectMember);

export default router;
