import express from 'express';
import {
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getMyTasks,
  updateTaskProgress,
  updateTaskStatus,
} from '../controllers/taskController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('tasks'));
router.use(attachTenantDb);

router.get('/my-tasks', getMyTasks);
router.get('/', getAllTasks);
router.get('/:id', getTask);

// Mutating tasks is restricted to ADMIN, MANAGER, and MEMBER roles.
// CLIENT users have read-only access.
router.post('/', authorize('ADMIN', 'MANAGER', 'MEMBER'), createTask);
router.put('/:id', authorize('ADMIN', 'MANAGER', 'MEMBER'), updateTask);
router.patch('/:id/progress', authorize('ADMIN', 'MANAGER', 'MEMBER'), updateTaskProgress);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'MEMBER'), updateTaskStatus);
router.delete('/:id', authorize('ADMIN', 'MANAGER', 'MEMBER'), deleteTask);

export default router;
