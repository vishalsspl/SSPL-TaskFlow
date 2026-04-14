import express from 'express';
import { 
    getStats, 
    getOrganizations, 
    createOrganization,
    updateOrganization, 
    updateOrganizationStatus,
    getGlobalUsers,
    forceResetPassword,
    deleteGlobalUser,
    getGlobalAuditLogs
} from '../controllers/superadminController.js';
import {
    getSuperAdminNotifications,
    markSuperAdminAsRead,
    markAllSuperAdminAsRead,
    deleteSuperAdminNotification,
} from '../controllers/superAdminNotificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All superadmin routes require authentication and SUPERADMIN role
router.use(authenticate);
router.use(authorize('SUPERADMIN'));

router.get('/stats', getStats);
router.get('/orgs', getOrganizations);
router.post('/orgs', createOrganization);
router.put('/orgs/:id', updateOrganization);
router.patch('/orgs/:id/status', updateOrganizationStatus);

router.get('/users', getGlobalUsers);
router.post('/users/:id/force-reset', forceResetPassword);
router.delete('/users/:id', deleteGlobalUser);

router.get('/audit', getGlobalAuditLogs);

// Global Notification routes
router.get('/notifications', getSuperAdminNotifications);
router.patch('/notifications/:id/read', markSuperAdminAsRead);
router.patch('/notifications/read-all', markAllSuperAdminAsRead);
router.delete('/notifications/:id', deleteSuperAdminNotification);

export default router;
