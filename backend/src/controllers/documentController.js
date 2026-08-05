import { PrismaClient } from '../../generated/tenant-client/index.js';

const getTenantDb = (req) => {
  if (!req.tenantDbUrl) throw new Error('Tenant DB URL missing');
  return new PrismaClient({
    datasourceUrl: req.tenantDbUrl
  });
};

export const getDocuments = async (req, res) => {
  const { projectId } = req.params;
  const prisma = getTenantDb(req);
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
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getDocumentById = async (req, res) => {
  const { id } = req.params;
  const prisma = getTenantDb(req);
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
  } finally {
    await prisma.$disconnect();
  }
};

export const createDocument = async (req, res) => {
  const { projectId } = req.params;
  const { title, content } = req.body;
  const authorId = req.user.id;
  const prisma = getTenantDb(req);
  try {
    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        content,
        authorId
      }
    });
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  } finally {
    await prisma.$disconnect();
  }
};

export const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const prisma = getTenantDb(req);
  try {
    const document = await prisma.document.update({
      where: { id },
      data: { title, content }
    });
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const prisma = getTenantDb(req);
  try {
    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  } finally {
    await prisma.$disconnect();
  }
};
