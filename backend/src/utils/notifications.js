import { NOTIFICATION_CATEGORIES, DEFAULT_NOTIFICATION_PREFERENCES } from '../controllers/userController.js';

/** Fetch user's notification preferences from DB */
const getUserNotificationPrefs = async (db, userId) => {
  try {
    const result = await db.$queryRawUnsafe(
      'SELECT "notificationPreferences" FROM "User" WHERE "id" = $1 LIMIT 1',
      userId
    );
    return result?.[0]?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    // Column might not exist yet — return defaults (all enabled)
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
};

/** Create and emit an internal notification (respects user preferences) */
export const createNotification = async (req, { userId, title, message, type, link }) => {
    try {
      // Check user preferences for in-app notifications
      const category = NOTIFICATION_CATEGORIES[type];
      if (category) {
        const prefs = await getUserNotificationPrefs(req.db, userId);
        let isEnabled = true;
        
        if (prefs?.inApp?.[type] !== undefined) {
          isEnabled = prefs.inApp[type];
        } else if (prefs?.inApp?.[category] !== undefined) {
          isEnabled = prefs.inApp[category];
        }

        if (!isEnabled) {
          console.log(`[Notification] Skipped in-app for ${userId} — type "${type}" disabled`);
          return null;
        }
      }

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

/** Check if a user has email notifications enabled for a given notification type */
export const shouldSendEmail = async (db, userId, notificationType) => {
  const category = NOTIFICATION_CATEGORIES[notificationType];
  if (!category) return true; // Unknown type — send by default

  try {
    const prefs = await getUserNotificationPrefs(db, userId);
    
    let isEnabled = true;
    if (prefs?.email?.[notificationType] !== undefined) {
      isEnabled = prefs.email[notificationType];
    } else if (prefs?.email?.[category] !== undefined) {
      isEnabled = prefs.email[category];
    }
    
    return isEnabled;
  } catch {
    return true; // On error, default to sending
  }
};
