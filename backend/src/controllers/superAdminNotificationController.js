import prisma from '../lib/prisma.js';

export const getSuperAdminNotifications = async (req, res) => {
  try {
    // Using Raw SQL for compatibility when Prisma client is out of sync
    const notifications = await prisma.$queryRaw`
      SELECT * FROM "Notification" 
      WHERE "userId" = ${req.user.id} 
      ORDER BY "createdAt" DESC 
      LIMIT 100
    `;

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching SuperAdmin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markSuperAdminAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$executeRaw`
      UPDATE "Notification" 
      SET "isRead" = true 
      WHERE "id" = ${id} AND "userId" = ${req.user.id}
    `;

    res.json({ id, isRead: true });
  } catch (error) {
    console.error('Error marking SuperAdmin notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllSuperAdminAsRead = async (req, res) => {
  try {
    await prisma.$executeRaw`
      UPDATE "Notification" 
      SET "isRead" = true 
      WHERE "userId" = ${req.user.id} AND "isRead" = false
    `;

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all SuperAdmin notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

export const deleteSuperAdminNotification = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$executeRaw`
      DELETE FROM "Notification" 
      WHERE "id" = ${id} AND "userId" = ${req.user.id}
    `;

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting SuperAdmin notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
