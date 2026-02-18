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
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/my-tasks', getMyTasks);
router.get('/', getAllTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/progress', updateTaskProgress);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

export default router;
