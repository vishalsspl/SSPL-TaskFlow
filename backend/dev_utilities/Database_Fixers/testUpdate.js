import { PrismaClient as MainPrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../../generated/tenant-client/index.js';

async function main() {
  const mainPrisma = new MainPrismaClient();
  const org = await mainPrisma.organization.findFirst({
    where: { name: 'Sveltoz Solutions Pvt Ltd' }
  });

  const req = {
    params: { id: 'ec13cc45-3214-4547-8b1f-b2e21e8caf12' },
    body: {
      title: 'Testing dashboard',
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    },
    user: {
      id: 'mock-user-id',
      organizationId: org.id,
      role: 'ADMIN',
      name: 'Test Admin'
    },
    db: new TenantPrismaClient({ datasources: { db: { url: org.dbUrl } } }),
    headers: {}
  };

  const res = {
    status: (code) => ({
      json: (data) => console.log(`[RES ${code}]`, data)
    }),
    json: (data) => console.log('[RES 200]', data)
  };

  try {
    // Paste the logic from updateTask here to catch the exact error
    const { id } = req.params;
    const {
      title, description, assigneeIds, status, priority,
      completionPercentage, dueDate, tags, phaseId,
      storyPoints, type, sendEmail = true, attachments, completedAt
    } = req.body;

    const existingTask = await req.db.task.findFirst({
      where: { id, project: { organizationId: req.user.organizationId } },
      include: { assignees: { include: { user: true } } },
    });

    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    const existingAssigneeIds = existingTask.assignees.map((a) => a.userId);
    const newAssigneeIds = assigneeIds !== undefined ? assigneeIds : existingAssigneeIds;

    let newCompletedAt = undefined;
    const newStatus = status !== undefined ? status : existingTask.status;
    const newProgress = completionPercentage !== undefined ? completionPercentage : existingTask.completionPercentage;
    
    if (newStatus === 'COMPLETED' || newProgress === 100) {
      if (completedAt !== undefined && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
        newCompletedAt = completedAt ? new Date(completedAt) : new Date();
      } else {
        newCompletedAt = existingTask.completedAt || new Date();
      }
    } else {
      newCompletedAt = null;
    }

    const addedIds = newAssigneeIds.filter((uid) => !existingAssigneeIds.includes(uid));

    const task = await req.db.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        completionPercentage,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        completedAt: newCompletedAt,
        tags,
        phaseId,
        storyPoints: storyPoints !== undefined ? (storyPoints ? parseInt(storyPoints) : 0) : undefined,
        type: type !== undefined ? type : undefined,
        attachments: attachments !== undefined ? attachments : undefined,
        ...(assigneeIds !== undefined && {
          assignees: {
            deleteMany: {},
            create: newAssigneeIds.map((userId) => ({ userId })),
          },
        }),
      },
    });

    console.log("Success!", task.id);
  } catch (error) {
    console.error("EXACT ERROR:", error);
  } finally {
    await req.db.$disconnect();
    await mainPrisma.$disconnect();
  }
}

main();
