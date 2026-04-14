import express from 'express';
import { login, signup, invite, bulkInvite, me, logout, changePassword, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { attachTenantDb } from '../middleware/tenantMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User login, signup, and authentication management
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successfully logged in, returns a JWT token
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user and create an organization
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - organizationName
 *               - industry
 *               - size
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               organizationName:
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
 *     responses:
 *       201:
 *         description: Successfully registered, returns token + user
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/signup', signup);

/**
 * @swagger
 * /api/auth/invite:
 *   post:
 *     summary: Invite a new user to the organization
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Only Admins or Managers can invite users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [MANAGER, MEMBER, CLIENT]
 *               password:
 *                 type: string
 *                 description: Initial password for the user
 *     responses:
 *       201:
 *         description: Successfully invited
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — role not allowed or user limit reached
 */
router.post('/invite', authenticate, authorize('ADMIN', 'MANAGER'), attachTenantDb, invite);

/**
 * @swagger
 * /api/auth/bulk-invite:
 *   post:
 *     summary: Bulk invite users from an Excel import
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only — import multiple users at once from a spreadsheet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [MANAGER, MEMBER, CLIENT]
 *                     password:
 *                       type: string
 *     responses:
 *       200:
 *         description: Import results with per-row status
 *       400:
 *         description: Validation error
 *       403:
 *         description: User limit exceeded
 */
router.post('/bulk-invite', authenticate, authorize('ADMIN'), attachTenantDb, bulkInvite);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user and clock out
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, me);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change the current user's password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/change-password', authenticate, changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset link sent if email exists
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post('/reset-password', resetPassword);

export default router;