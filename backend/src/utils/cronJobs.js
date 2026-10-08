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
    processPlanExpirations();
  });

  cron.schedule('0 * * * *', () => { processDueDateNotifications(); });
  console.log('[Cron] Scheduled jobs initialized.');
};
import { sendPlanExpiryWarningEmail, sendPlanExpiredEmail, sendTaskDueEmail, sendTaskOverdueEmail } from '../services/emailService.js';

export const processPlanExpirations = async () => {
  console.log('[Cron] Running daily plan expiration check...');
  try {
    // Get policy
    const policySetting = await prisma.platformSetting.findUnique({ where: { key: 'expirationPolicy' } });
    const policy = policySetting?.value || 'AUTO_DOWNGRADE'; // AUTO_DOWNGRADE, SUSPEND, MANUAL

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // 1. WARNING EMAILS (7 days before)
    const warningOrgs = await prisma.organization.findMany({
      where: {
        plan: { not: 'FREE' },
        currentPeriodEnd: {
          gte: new Date(sevenDaysFromNow.setHours(0,0,0,0)),
          lte: new Date(sevenDaysFromNow.setHours(23,59,59,999))
        }
      }
    });

    for (const org of warningOrgs) {
      if (org.billingEmail || org.adminEmail) {
         await sendPlanExpiryWarningEmail(org.billingEmail || 'admin@'+org.name+'.com', org.primaryContactName || 'Admin', org.name, 7);
      }
    }

    // 2. PROCESS EXPIRED PLANS (Grace period over = expiry + 7 days)
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() - 7); // If expired 7 days ago, grace period is over

    const expiredOrgs = await prisma.organization.findMany({
      where: {
        plan: { not: 'FREE' },
        currentPeriodEnd: {
          lte: graceEnd
        },
        status: 'ACTIVE' // Avoid re-processing suspended ones
      }
    });

    for (const org of expiredOrgs) {
      if (policy === 'AUTO_DOWNGRADE') {
        await prisma.organization.update({
          where: { id: org.id },
          data: { plan: 'FREE' }
        });
        await sendPlanExpiredEmail(org.billingEmail || 'admin@'+org.name+'.com', org.primaryContactName || 'Admin', org.name, 'Downgraded to FREE Plan');
        console.log(`[Cron] Auto-downgraded org ${org.id} to FREE`);
      } else if (policy === 'SUSPEND') {
        await prisma.organization.update({
          where: { id: org.id },
          data: { status: 'SUSPENDED', suspendedReason: 'Plan Expired (Grace Period Ended)' }
        });
        await sendPlanExpiredEmail(org.billingEmail || 'admin@'+org.name+'.com', org.primaryContactName || 'Admin', org.name, 'Account Suspended');
        console.log(`[Cron] Suspended org ${org.id} due to expiry`);
      } else if (policy === 'MANUAL') {
        await sendPlanExpiredEmail(org.billingEmail || 'admin@'+org.name+'.com', org.primaryContactName || 'Admin', org.name, 'Please contact support immediately');
        console.log(`[Cron] Manual policy - emailed expired org ${org.id}`);
      }
    }

    console.log('[Cron] Expiration check completed.');
  } catch (err) {
    console.error('[Cron] Error processing expirations:', err);
  }
};

export const processDueDateNotifications = async () => {
  console.log('[Cron] Running hourly due date notifications check...');
  try {
    const organizations = await prisma.organization.findMany({
      where: { dbStrategy: 'DEDICATED', dbUrl: { not: null } },
      select: { id: true, dbUrl: true, name: true }
    });

    for (const org of organizations) {
      try {
        const tenantDb = await tenantDbManager.getClient(org.dbUrl);
        
        // Find tasks that are not completed and have a due date
        const activeTasks = await tenantDb.task.findMany({
          where: { 
            status: { not: 'COMPLETED' },
            dueDate: { not: null }
          },
          include: {
            assignees: {
              include: { user: true }
            },
            project: {
              include: { manager: true }
            }
          }
        });

        const now = new Date();

        for (const task of activeTasks) {
          const dueDate = new Date(task.dueDate);
          const timeDiff = dueDate.getTime() - now.getTime();
          const hoursLeft = timeDiff / (1000 * 60 * 60);

          let notificationType = null;
          let timeFrame = null;
          let isOverdue = false;

          if (hoursLeft > 24 && hoursLeft <= 48) {
            notificationType = 'TASK_DUE_48H';
            timeFrame = 'in 2 days';
          } else if (hoursLeft > 0 && hoursLeft <= 24) {
            notificationType = 'TASK_DUE_24H';
            timeFrame = 'tomorrow';
          } else if (hoursLeft <= 0 && hoursLeft > -24) {
            // Task is overdue (by up to 24 hours) - we escalate
            notificationType = 'TASK_OVERDUE';
            isOverdue = true;
          }

          if (notificationType) {
            for (const assignee of task.assignees) {
              const userId = assignee.user.id;
              
              // Check if notification already exists
              const existingNotif = await tenantDb.notification.findFirst({
                where: {
                  userId,
                  type: notificationType,
                  link: `/tasks/${task.id}`
                }
              });

              if (!existingNotif) {
                // 1. Create In-App Notification
                await tenantDb.notification.create({
                  data: {
                    userId,
                    organizationId: org.id,
                    title: isOverdue ? 'Task Overdue' : 'Task Due Soon',
                    message: isOverdue 
                      ? `Task "${task.title}" is overdue!` 
                      : `Task "${task.title}" is due ${timeFrame}.`,
                    type: notificationType,
                    link: `/tasks/${task.id}`
                  }
                });

                // 2. Send Email Notification
                if (assignee.user.email) {
                  if (isOverdue) {
                    await sendTaskOverdueEmail(
                      assignee.user.email, assignee.user.name, task.title, 
                      task.project?.name, false, process.env.FRONTEND_URL
                    );
                  } else {
                    await sendTaskDueEmail(
                      assignee.user.email, assignee.user.name, task.title, 
                      task.project?.name, timeFrame, process.env.FRONTEND_URL
                    );
                  }
                }
              }
            }

            // If Overdue, also notify Project Manager
            if (isOverdue && task.project?.manager) {
              const manager = task.project.manager;
              const managerNotif = await tenantDb.notification.findFirst({
                where: {
                  userId: manager.id,
                  type: notificationType,
                  link: `/tasks/${task.id}`
                }
              });

              if (!managerNotif) {
                // In-App for Manager
                await tenantDb.notification.create({
                  data: {
                    userId: manager.id,
                    organizationId: org.id,
                    title: 'Escalation: Task Overdue',
                    message: `Task "${task.title}" assigned in your project "${task.project.name}" is overdue.`,
                    type: notificationType,
                    link: `/tasks/${task.id}`
                  }
                });
                
                // Email for Manager
                if (manager.email) {
                  await sendTaskOverdueEmail(
                    manager.email, manager.name, task.title, 
                    task.project.name, true, process.env.FRONTEND_URL
                  );
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Cron] Error checking due dates for Org: ${org.id}`, err.message);
      }
    }
    console.log('[Cron] Due date notifications check completed.');
  } catch (error) {
    console.error('[Cron] Error running due date notifications:', error);
  }
};
