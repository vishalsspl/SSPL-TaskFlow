/** Create and emit an internal notification */
export const createNotification = async (req, { userId, title, message, type, link }) => {
    try {
      const notification = await req.db.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          link: link || null,
          organizationId: req.user.organizationId,
        },
      });
  
      if (req.io) {
        req.io.to(`org-${req.user.organizationId}`).emit('new-notification', notification);
      }
      return notification;
    } catch (error) {
      console.error('Failed to create internal notification:', error);
    }
  };
  
