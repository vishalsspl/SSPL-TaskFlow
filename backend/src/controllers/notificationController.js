import prisma from '../lib/prisma.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await req.db.notification.findMany({
      where: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await req.db.notification.update({
      where: {
        id,
        userId: req.user.id,
      },
      data: {
        isRead: true,
      },
    });

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await req.db.notification.updateMany({
      where: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.notification.delete({
      where: {
        id,
        userId: req.user.id,
      },
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
