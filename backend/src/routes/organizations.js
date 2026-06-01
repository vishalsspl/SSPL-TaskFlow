import express from 'express';
import { getMyOrganization, updateMyOrganization, getPublicOrganization, getAllOrganizations, updateOrgByAdmin, deleteOrganization, getOrgActivityLogs, getOrgPermissions, updateOrgPermissions } from '../controllers/organizationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Public routes (no auth)
router.get('/public', getPublicOrganization);

// Protected routes (require auth)
router.use(authenticate);
router.use(attachTenantDb);

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organisation profile and settings
 */

/**
 * @swagger
 * /api/organizations/me:
 *   get:
 *     summary: Get the current user's organisation
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organisation data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organisation not found
 */
router.get('/me', getMyOrganization);
router.get('/activity-logs', authorize('ADMIN'), getOrgActivityLogs);

// Role permissions
router.get('/permissions', authorize('ADMIN', 'MANAGER', 'MEMBER', 'CLIENT'), getOrgPermissions);
router.put('/permissions', authorize('ADMIN'), updateOrgPermissions);

/**
 * @swagger
 * /api/organizations/me:
 *   put:
 *     summary: Update the current organisation profile
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     description: Only ADMIN can update organisation details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               industry:
 *                 type: string
 *               size:
 *                 type: string
 *               website:
 *                 type: string
 *               country:
 *                 type: string
 *               timezone:
 *                 type: string
 *               billingEmail:
 *                 type: string
 *               primaryContactName:
 *                 type: string
 *               primaryContactPhone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated organisation
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
router.put('/me', authorize('ADMIN'), updateMyOrganization);

// SUPERADMIN — all orgs
router.get('/', authorize('SUPERADMIN'), getAllOrganizations);
router.patch('/:id', authorize('SUPERADMIN'), updateOrgByAdmin);
router.delete('/:id', authorize('SUPERADMIN'), deleteOrganization);

export default router;