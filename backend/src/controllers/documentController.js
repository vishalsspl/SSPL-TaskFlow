import { createNotification, shouldSendEmail } from '../utils/notifications.js';
import { sendDocumentUploadedEmail } from '../services/emailService.js';
import prismaGlobal from '../lib/prisma.js';

export const getDocuments = async (req, res) => {
  const { projectId } = req.params;
  const prisma = req.db;
  try {
    const documents = await prisma.document.findMany({
      where: { projectId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message, stack: error.stack });
    // No need to disconnect req.db as it's cached by tenantDbManager
  }
};

export const getDocumentById = async (req, res) => {
  const { id } = req.params;
  const prisma = req.db;
  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document', details: error.message, stack: error.stack });
  }
};

export const createDocument = async (req, res) => {
  const { projectId } = req.params;
  const { title, content, attachments } = req.body;
  const authorId = req.user.id;
  const prisma = req.db;
  try {
    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        content,
        attachments: attachments || [],
        authorId
      }
    });

    try {
      const logData = {
        userId: authorId,
        organizationId: req.user.organizationId,
        projectId,
        action: 'DOCUMENT_UPLOADED',
        entity: 'document',
        entityId: document.id,
        details: { documentTitle: title },
      };
      
      await prisma.activityLog.create({ data: logData });
      await prismaGlobal.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('Failed to log document upload activity:', logErr);
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { workloads: { include: { user: true } } }
      });
      
      const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
      const uploaderName = req.user.name;

      if (project && project.workloads) {
        for (const workload of project.workloads) {
          if (workload.userId !== authorId) {
            // Send in-app notification
            createNotification(req, {
              userId: workload.userId,
              title: 'New Document Uploaded',
              message: `A new document "${title}" has been uploaded to project: ${project.name}`,
              type: 'DOCUMENT_UPLOADED',
              link: `/projects/${projectId}?tab=docs`
            });

            // Send email notification if supported
            if (hasEmailSupport && workload.user?.email) {
              if (await shouldSendEmail(req.db, workload.userId, 'DOCUMENT_UPLOADED')) {
                sendDocumentUploadedEmail(
                  workload.user.email,
                  workload.user.name,
                  title,
                  project.name,
                  uploaderName,
                  origin
                ).catch(err => console.error('Failed to send document uploaded email:', err));
              }
            }
          }
        }
      }
    } catch (notifErr) {
      console.error('Failed to send document upload notifications:', notifErr);
    }

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document', details: error.message, stack: error.stack });
  }
};

export const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { title, content, attachments } = req.body;
  const prisma = req.db;
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { project: { include: { managers: true } } }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const isAuthor = doc.authorId === req.user.id;
    const isProjectManager = doc.project?.managers?.some(m => m.id === req.user.id);
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

    if (!isAuthor && !isProjectManager && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to edit this document' });
    }

    const document = await prisma.document.update({
      where: { id },
      data: { title, content, attachments: attachments || [] }
    });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: doc.projectId,
        action: 'DOCUMENT_UPDATED',
        entity: 'document',
        entityId: document.id,
        details: { documentTitle: title },
      };
      
      await req.db.activityLog.create({ data: logData });
      await prismaGlobal.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('Failed to log document update activity:', logErr);
    }

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document', details: error.message, stack: error.stack });
  }
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const prisma = req.db;
  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { project: { include: { managers: true } } }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const isAuthor = doc.authorId === req.user.id;
    const isProjectManager = doc.project?.managers?.some(m => m.id === req.user.id);
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

    if (!isAuthor && !isProjectManager && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this document' });
    }

    await prisma.document.delete({ where: { id } });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: doc.projectId,
        action: 'DOCUMENT_DELETED',
        entity: 'document',
        entityId: doc.id,
        details: { documentTitle: doc.title },
      };
      
      await req.db.activityLog.create({ data: logData });
      await prismaGlobal.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('Failed to log document delete activity:', logErr);
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message, stack: error.stack });
  }
};
