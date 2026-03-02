import express from 'express';
import { getUsers, updateUser, deleteUser, approveUser, getManagedUsers, updateProfile, getMemberProgress } from '../controllers/userController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getUsers);
router.patch('/profile', updateProfile);
router.put('/:id', updateUser);
router.put('/:id/approve', approveUser);
router.get('/:id/team', getManagedUsers);
router.get('/:id/progress', getMemberProgress);
router.delete('/:id', deleteUser);

export default router;
