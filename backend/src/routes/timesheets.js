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
import { authenticate, authorize } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('timesheets'));
router.use(attachTenantDb);

// Time entries
router.get('/', getTimeEntries);
router.post('/', createTimeEntry);
router.put('/:id', updateTimeEntry);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), updateTimeEntryStatus);
router.delete('/:id', deleteTimeEntry);

// Work logs
router.get('/worklogs', getWorkLogs);
router.post('/worklogs', createWorkLog);
router.delete('/worklogs/:id', deleteWorkLog);

// Performance
router.get('/performance/team', authorize('ADMIN', 'MANAGER'), getTeamPerformance);
router.get('/performance/:userId', getUserPerformance);

export default router;