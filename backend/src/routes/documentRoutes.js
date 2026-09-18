import express from 'express';
import multer from 'multer';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  patchDocument,
  deleteDocument,
  duplicateDocument,
  exportDocument,
  importDocument
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { attachTenantDb } from '../middleware/tenantMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticate);
router.use(attachTenantDb);

router.get('/project/:projectId', getDocuments);
router.post('/project/:projectId', createDocument);
router.post('/import/project/:projectId', upload.single('file'), importDocument);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.patch('/:id', patchDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/duplicate', duplicateDocument);
router.get('/:id/export', exportDocument);

export default router;
