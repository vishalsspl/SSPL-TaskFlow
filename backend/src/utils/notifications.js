import { NOTIFICATION_CATEGORIES, DEFAULT_NOTIFICATION_PREFERENCES } from '../controllers/userController.js';
import { sendPushNotification } from './firebasePush.js';

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
      // Fetch user preferences
      const prefs = await getUserNotificationPrefs(req.db, userId);
      const category = NOTIFICATION_CATEGORIES[type];
      
      let inAppEnabled = true;
      let pushEnabled = true;

      if (category) {
        if (prefs?.inApp?.[type] !== undefined) {
          inAppEnabled = prefs.inApp[type];
        } else if (prefs?.inApp?.[category] !== undefined) {
          inAppEnabled = prefs.inApp[category];
        }

        if (prefs?.push?.[type] !== undefined) {
          pushEnabled = prefs.push[type];
        } else if (prefs?.push?.[category] !== undefined) {
          pushEnabled = prefs.push[category];
        }
      }

      // 1. In-App Notification (Database & WebSocket)
      if (inAppEnabled) {
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
      } else {
        console.log(`[Notification] Skipped in-app for ${userId} — type "${type}" disabled`);
      }

      // 2. Push Notification (Firebase)
      if (pushEnabled) {
        await sendPushNotification(userId, title, message);
      }

      // Note: We return null here if inApp was skipped, but that's fine since most callers ignore the return value.
      return inAppEnabled ? { success: true } : null;
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
