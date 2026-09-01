import admin from '../config/firebase.js';
import prisma from '../lib/prisma.js';

export const sendPushNotification = async (userId, title, body) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true }
    });

    if (user && user.fcmToken) {
      const message = {
        notification: {
          title,
          body
        },
        token: user.fcmToken
      };

      await admin.messaging().send(message);
      console.log(`Push notification sent to ${userId}`);
    }
  } catch (error) {
    console.error(`Failed to send push notification to ${userId}:`, error.message);
  }
};
