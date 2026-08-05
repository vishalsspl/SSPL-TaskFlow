import express from 'express';
import { getDocuments, getDocumentById, createDocument, updateDocument, deleteDocument } from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { attachTenantDb } from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(attachTenantDb);

router.get('/project/:projectId', getDocuments);
router.post('/project/:projectId', createDocument);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
