import express from 'express';
import {
    getTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    updateTimeEntryStatus,
    deleteTimeEntry,
    getWorkLogs,
    createWorkLog,
    deleteWorkLog,
    getUserPerformance,
    getTeamPerformance,
} from '../controllers/timesheetController.js';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('timesheets'));
router.use(attachTenantDb);

// Time entries
router.get('/', getTimeEntries);
router.post('/', requirePermission('timesheets.create'), createTimeEntry);
router.put('/:id', requirePermission('timesheets.create'), updateTimeEntry);
router.patch('/:id/status', requirePermission('timesheets.approve'), updateTimeEntryStatus);
router.delete('/:id', deleteTimeEntry);

// Work logs
router.get('/worklogs', getWorkLogs);
router.post('/worklogs', requirePermission('timesheets.create'), createWorkLog);
router.delete('/worklogs/:id', deleteWorkLog);

// Performance
router.get('/performance/team', authorize('ADMIN', 'MANAGER'), getTeamPerformance);
router.get('/performance/:userId', getUserPerformance);

export default router;