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
  
      console.log(`[Notification Debug] Created DB record for ${userId}. Emitting to org-${req.user.organizationId}`);

      if (req.io) {
        const room = `org-${req.user.organizationId}`;
        req.io.to(room).emit('new-notification', notification);
        console.log(`[Notification Debug] Socket emitted to room: ${room}`);
      }
      return notification;
    } catch (error) {
      console.error('Failed to create internal notification:', error);
    }
  };
  
