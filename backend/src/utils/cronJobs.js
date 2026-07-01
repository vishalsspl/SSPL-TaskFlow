import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import tenantDbManager from '../lib/tenantDbManager.js';

const deleteOldNotifications = async () => {
  console.log('[Cron] Running daily notification cleanup...');

  // Date threshold: 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // 1. Delete from Main DB
    const mainDeleted = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: {
          lte: sevenDaysAgo,
        },
      },
    });
    console.log(`[Cron] Deleted ${mainDeleted.count} old notifications from Main DB`);

    // 2. Fetch all organizations with dedicated databases
    const organizations = await prisma.organization.findMany({
      where: {
        dbStrategy: 'DEDICATED',
        dbUrl: { not: null },
      },
      select: {
        id: true,
        dbUrl: true,
      },
    });

    // 3. Delete from each Tenant DB
    for (const org of organizations) {
      try {
        const tenantDb = await tenantDbManager.getClient(org.dbUrl);
        const tenantDeleted = await tenantDb.notification.deleteMany({
          where: {
            isRead: true,
            readAt: {
              lte: sevenDaysAgo,
            },
          },
        });
        if (tenantDeleted.count > 0) {
          console.log(`[Cron] Deleted ${tenantDeleted.count} old notifications from Tenant DB (Org: ${org.id})`);
        }
      } catch (err) {
        console.error(`[Cron] Error deleting notifications for Tenant DB (Org: ${org.id}):`, err.message);
      }
    }

    console.log('[Cron] Notification cleanup completed successfully.');
  } catch (error) {
    console.error('[Cron] Error running notification cleanup:', error);
  }
};

export const initCronJobs = () => {
  // Run every day at midnight (server time)
  cron.schedule('0 0 * * *', () => {
    deleteOldNotifications();
  });

  console.log('[Cron] Scheduled jobs initialized.');
};
