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
  approveTaskStatus,
  rejectTaskStatus,
  bulkCreateTasks,
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
router.post('/bulk-create', authorize('ADMIN', 'MANAGER', 'MEMBER'), bulkCreateTasks);
router.put('/:id', authorize('ADMIN', 'MANAGER', 'MEMBER'), updateTask);
router.patch('/:id/progress', authorize('ADMIN', 'MANAGER', 'MEMBER'), updateTaskProgress);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'MEMBER'), updateTaskStatus);
router.post('/:id/approve-status', authorize('ADMIN', 'MANAGER'), approveTaskStatus);
router.post('/:id/reject-status', authorize('ADMIN', 'MANAGER'), rejectTaskStatus);
router.delete('/:id', authorize('ADMIN', 'MANAGER', 'MEMBER'), deleteTask);

export default router;
