

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
    const document = await prisma.document.update({
      where: { id },
      data: { title, content, attachments: attachments || [] }
    });
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
    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message, stack: error.stack });
  }
};
