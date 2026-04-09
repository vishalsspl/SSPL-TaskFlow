import express from 'express';
import { getUsers, updateUser, deleteUser, approveUser, getManagedUsers, updateProfile, getMemberProgress } from '../controllers/userController.js';

import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile endpoints
 */

router.use(authenticate);
router.use(attachTenantDb);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retrieve a list of users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pending
 *         schema:
 *           type: boolean
 *         description: Filter by pending approval status
 *       - in: query
 *         name: teamOnly
 *         schema:
 *           type: boolean
 *         description: Managers only - get only team members
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: A list of users.
 *       401:
 *         description: Unauthorized
 */
router.get('/', getUsers);

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile', updateProfile);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user's role or manager
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [MANAGER, MEMBER, CLIENT]
 *               managerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put('/:id', updateUser);

/**
 * @swagger
 * /api/users/{id}/approve:
 *   put:
 *     summary: Approve a pending user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User approved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put('/:id/approve', approveUser);

/**
 * @swagger
 * /api/users/{id}/team:
 *   get:
 *     summary: Get all team members managed by a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of team members
 *       403:
 *         description: Forbidden
 */
router.get('/:id/team', getManagedUsers);

/**
 * @swagger
 * /api/users/{id}/progress:
 *   get:
 *     summary: Get progress stats for a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User progress statistics
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/:id/progress', getMemberProgress);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete('/:id', deleteUser);

export default router;
