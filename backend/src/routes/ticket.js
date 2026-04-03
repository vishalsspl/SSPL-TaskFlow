import express from 'express';
import {
    createTicket,
    getAllTickets,
    getTicket,
    updateTicketStatus,
    addComment,
} from '../controllers/ticketController.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = express.Router();

router.use(authenticate);
router.use(requireFeature('tickets'));
router.use(attachTenantDb);

router.get('/', getAllTickets);
router.get('/:id', getTicket);
router.post('/', createTicket);
router.patch('/:id/status', updateTicketStatus);
router.post('/:id/comments', addComment);

export default router;
