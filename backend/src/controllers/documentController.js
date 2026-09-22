import { createNotification, shouldSendEmail } from '../utils/notifications.js';
import { sendDocumentUploadedEmail } from '../services/emailService.js';
import prismaGlobal from '../lib/prisma.js';
import { 
  exportDocumentToDocx, 
  exportSpreadsheetToXlsx, 
  importDocxToHtml, 
  importXlsxToSheetData 
} from '../services/documentExportService.js';
import { uploadDir } from '../config/storage.js';

export const getDocuments = async (req, res) => {
  const { projectId } = req.params;
  const { search, type, sort = 'updatedAt', order = 'desc' } = req.query;
  const prisma = req.db;
  try {
    const where = { projectId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (type) {
      where.type = type;
    }

    const orderBy = {
      [sort]: order
    };

    const documents = await prisma.document.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy
    });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
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
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

export const createDocument = async (req, res) => {
  const { projectId } = req.params;
  const { title, content, type = 'DOCUMENT', attachments = [] } = req.body;
  const authorId = req.user.id;
  const prisma = req.db;
  try {
    let finalContent = content;
    if (finalContent === undefined) {
      finalContent = type === 'SPREADSHEET' ? '{}' : '';
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        content: finalContent,
        type,
        attachments,
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
        details: { documentTitle: title, message: `Created document "${title}"` },
      };
      
      if (req.db && req.db.activityLog) {
        await req.db.activityLog.create({ data: logData }).catch(e => console.error('Tenant log error:', e));
      }
      await prismaGlobal.activityLog.create({ data: logData }).catch(e => console.error('Global log error:', e));
    } catch (logErr) {
      console.error('Failed to log document create activity:', logErr);
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { workloads: { include: { user: true } } }
      });

      if (project && project.workloads) {
        for (const workload of project.workloads) {
          if (workload.userId !== authorId) {
            await createNotification(
              req.db,
              workload.userId,
              'New Document Created',
              `A new document "${title}" has been added to project: ${project.name}`,
              'DOCUMENT_UPLOADED',
              `/projects/${projectId}`
            ).catch(err => console.error('Failed to create notification:', err));

            if (await shouldSendEmail(req.db, workload.userId, 'DOCUMENT_UPLOADED')) {
              sendDocumentUploadedEmail(
                workload.user.email,
                workload.user.name,
                title,
                project.name,
                req.user.name
              ).catch(err => console.error('Failed to send email:', err));
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
    res.status(500).json({ error: 'Failed to create document' });
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
      data: {
        title: title !== undefined ? title : doc.title,
        content: content !== undefined ? content : doc.content,
        attachments: attachments !== undefined ? attachments : doc.attachments,
      }
    });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: document.projectId,
        action: 'DOCUMENT_UPDATED',
        entity: 'document',
        entityId: document.id,
        details: { documentTitle: document.title, message: `Updated document "${document.title}"` },
      };
      
      if (req.db && req.db.activityLog) {
        await req.db.activityLog.create({ data: logData }).catch(e => console.error('Tenant log error:', e));
      }
      await prismaGlobal.activityLog.create({ data: logData }).catch(e => console.error('Global log error:', e));
    } catch (logErr) {
      console.error('Failed to log document update activity:', logErr);
    }

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

export const patchDocument = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
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
      data: {
        title: title !== undefined ? title : doc.title,
        content: content !== undefined ? content : doc.content,
      }
    });

    // Skip activity logging for auto-save

    res.json(document);
  } catch (error) {
    console.error('Error patching document:', error);
    res.status(500).json({ error: 'Failed to patch document' });
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
        details: { documentTitle: doc.title, message: `Deleted document "${doc.title}"` },
      };
      
      if (req.db && req.db.activityLog) {
        await req.db.activityLog.create({ data: logData }).catch(e => console.error('Tenant log error:', e));
      }
      await prismaGlobal.activityLog.create({ data: logData }).catch(e => console.error('Global log error:', e));
    } catch (logErr) {
      console.error('Failed to log document delete activity:', logErr);
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const duplicateDocument = async (req, res) => {
  const { id } = req.params;
  const prisma = req.db;
  try {
    const original = await prisma.document.findUnique({
      where: { id }
    });
    if (!original) return res.status(404).json({ error: 'Document not found' });

    const document = await prisma.document.create({
      data: {
        projectId: original.projectId,
        title: `${original.title} (Copy)`,
        content: original.content,
        type: original.type,
        attachments: original.attachments,
        authorId: req.user.id
      }
    });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: document.projectId,
        action: 'DOCUMENT_UPLOADED', // or DOCUMENT_DUPLICATED
        entity: 'document',
        entityId: document.id,
        details: { documentTitle: document.title, message: `Duplicated document as "${document.title}"` },
      };
      
      if (req.db && req.db.activityLog) {
        await req.db.activityLog.create({ data: logData }).catch(e => console.error('Tenant log error:', e));
      }
      await prismaGlobal.activityLog.create({ data: logData }).catch(e => console.error('Global log error:', e));
    } catch (logErr) {}

    res.status(201).json(document);
  } catch (error) {
    console.error('Error duplicating document:', error);
    res.status(500).json({ error: 'Failed to duplicate document' });
  }
};

export const exportDocument = async (req, res) => {
  const { id } = req.params;
  const { format } = req.query;
  const prisma = req.db;

  try {
    const doc = await prisma.document.findUnique({
      where: { id }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.json"`);
      return res.send(doc.content);
    }

    if (doc.type === 'DOCUMENT' && format === 'docx') {
      const buffer = await exportDocumentToDocx(doc.title, doc.content);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.docx"`);
      return res.send(buffer);
    } 
    
    if (doc.type === 'SPREADSHEET' && format === 'xlsx') {
      let data = {};
      try {
        data = JSON.parse(doc.content);
      } catch (e) {}
      const buffer = await exportSpreadsheetToXlsx(doc.title, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.xlsx"`);
      return res.send(buffer);
    }

    res.status(400).json({ error: 'Invalid format or mismatched type' });
  } catch (error) {
    console.error('Error exporting document:', error);
    res.status(500).json({ error: 'Failed to export document' });
  }
};

export const importDocument = async (req, res) => {
  const { projectId } = req.params;
  const prisma = req.db;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const title = req.file.originalname.split('.').slice(0, -1).join('.');
    
    let type = 'DOCUMENT';
    let content = '';
    let attachments = [];

    if (ext === 'docx') {
      type = 'DOCUMENT';
      const result = await importDocxToHtml(req.file.buffer);
      content = result.html;
    } else if (ext === 'xlsx') {
      type = 'SPREADSHEET';
      const result = await importXlsxToSheetData(req.file.buffer);
      content = JSON.stringify(result);
    } else if (ext === 'pdf') {
      type = 'DOCUMENT';
      const fs = await import('fs');
      const path = await import('path');
      const { v4: uuidv4 } = await import('uuid');
      
      const uniqueName = `${uuidv4()}.${ext}`;
      const filePath = path.join(uploadDir, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);
      
      const fileUrl = `/uploads/${uniqueName}`;
      
      // Inline iframe to view PDF + Attachment link
      content = `<iframe src="${fileUrl}" width="100%" height="800px" style="border: none;"></iframe>`;
      attachments = [{
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        type: req.file.mimetype || 'application/pdf'
      }];
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use .docx, .xlsx, or .pdf' });
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        content,
        type,
        attachments: JSON.stringify(attachments),
        authorId: req.user.id,
      }
    });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: document.projectId,
        action: 'DOCUMENT_UPLOADED',
        entity: 'document',
        entityId: document.id,
        details: { documentTitle: document.title, message: `Imported document "${document.title}"` },
      };
      
      if (req.db && req.db.activityLog) {
        await req.db.activityLog.create({ data: logData }).catch(e => console.error('Tenant log error:', e));
      }
      await prismaGlobal.activityLog.create({ data: logData }).catch(e => console.error('Global log error:', e));
    } catch (logErr) {}

    res.status(201).json(document);
  } catch (error) {
    console.error('Error importing document:', error);
    res.status(500).json({ error: 'Failed to import document' });
  }
};
