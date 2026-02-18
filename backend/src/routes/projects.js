import express from 'express';
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllProjects);
router.get('/:id', getProject);
router.post('/', authorize('ADMIN', 'MANAGER'), createProject);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateProject);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteProject);

export default router;
