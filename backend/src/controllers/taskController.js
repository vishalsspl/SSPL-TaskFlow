import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllTasks = async (req, res) => {
  const { projectId, status, priority, assignedTo } = req.query;

  const where = {
    project: {
      organizationId: req.user.organizationId,
    },
  };

  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedTo) {
    where.assignees = { some: { userId: assignedTo } };
  }

  // If Manager, restrict visibility
  if (req.user.role === 'MANAGER') {
    where.OR = [
      { project: { managerId: req.user.id } },
      { assignees: { some: { userId: req.user.id } } },
    ];
  }

  // If Client, only show tasks from their projects
  if (req.user.role === 'CLIENT') {
    where.project = { ...where.project, clientId: req.user.id };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
      project: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(tasks);
};

export const getTask = async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: { id, project: { organizationId: req.user.organizationId } },
    include: {
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
      project: { select: { id: true, name: true } },
      phase: true,
    },
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });

  res.json(task);
};

import { sendTaskAssignmentEmail } from '../services/emailService.js';

export const createTask = async (req, res) => {
  const {
    projectId,
    phaseId,
    title,
    description,
    assigneeIds,   // array of user IDs
    status,
    priority,
    completionPercentage,
    dueDate,
    tags,
  } = req.body;

  if (!projectId || !title) {
    return res.status(400).json({ error: 'Project ID and title are required' });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: req.user.organizationId },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const task = await prisma.task.create({
    data: {
      projectId,
      phaseId: phaseId || null,
      title,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      completionPercentage: completionPercentage || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || [],
      assignees: {
        create: (assigneeIds || []).map((userId) => ({ userId })),
      },
    },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      project: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user.id,
      projectId,
      action: 'created',
      entity: 'task',
      entityId: task.id,
      details: { title: task.title },
    },
  });

  // Send email to all assignees
  const senderName = req.user.name;
  for (const { user } of task.assignees) {
    if (user?.email) {
      sendTaskAssignmentEmail(
        user.email,
        task.title,
        task.project.name,
        senderName,
        { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description }
      ).catch(err => console.error('Failed to send task assignment email:', err));
    }
  }

  res.status(201).json(task);
};

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    assigneeIds,   // array of user IDs or undefined
    status,
    priority,
    completionPercentage,
    dueDate,
    tags,
    phaseId,
  } = req.body;

  const existingTask = await prisma.task.findFirst({
    where: { id, project: { organizationId: req.user.organizationId } },
    include: { assignees: { include: { user: true } } },
  });
  if (!existingTask) return res.status(404).json({ error: 'Task not found' });

  const existingAssigneeIds = existingTask.assignees.map((a) => a.userId);
  const newAssigneeIds = assigneeIds !== undefined ? assigneeIds : existingAssigneeIds;
  const addedIds = newAssigneeIds.filter((uid) => !existingAssigneeIds.includes(uid));

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      status,
      priority,
      completionPercentage,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      tags,
      phaseId,
      ...(assigneeIds !== undefined && {
        assignees: {
          deleteMany: {},
          create: newAssigneeIds.map((userId) => ({ userId })),
        },
      }),
    },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      project: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user.id,
      projectId: task.projectId,
      action: 'updated',
      entity: 'task',
      entityId: task.id,
      details: { changes: req.body },
    },
  });

  // Email newly added assignees
  if (addedIds.length > 0) {
    const senderName = req.user.name;
    for (const { user } of task.assignees.filter((a) => addedIds.includes(a.userId))) {
      if (user?.email) {
        sendTaskAssignmentEmail(
          user.email,
          task.title,
          task.project.name,
          senderName,
          { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description }
        ).catch(err => console.error('Failed to send task assignment email:', err));
      }
    }
  }

  res.json(task);
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;

  // Verify task belongs to user's organization
  const existingTask = await prisma.task.findFirst({
    where: {
      id,
      project: {
        organizationId: req.user.organizationId,
      },
    },
  });

  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await prisma.task.delete({
    where: { id },
  });

  res.json({ message: 'Task deleted successfully' });
};

export const getMyTasks = async (req, res) => {
  try {
    // Check if user is admin/manager - they see all tasks
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';

    const where = {
      project: {
        organizationId: req.user.organizationId,
      },
    };

    // If not admin, only show tasks assigned to the user
    if (!isAdmin) {
      where.assignees = { some: { userId: req.user.id } };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};
// Helper to recalculate phase progress
const recalculatePhaseProgress = async (phaseId) => {
  if (!phaseId) return;

  const tasks = await prisma.task.findMany({
    where: { phaseId },
    select: { completionPercentage: true },
  });

  if (tasks.length === 0) return;

  const totalProgress = tasks.reduce((sum, task) => sum + task.completionPercentage, 0);
  const averageProgress = Math.round(totalProgress / tasks.length);

  await prisma.phase.update({
    where: { id: phaseId },
    data: { completionPercentage: averageProgress },
  });

  // Check if all tasks are completed to update phase status
  const allCompleted = tasks.every(t => t.completionPercentage === 100);
  const anyInProgress = tasks.some(t => t.completionPercentage > 0 && t.completionPercentage < 100);

  let phaseStatus = 'WAITING';
  if (allCompleted) phaseStatus = 'COMPLETED';
  else if (anyInProgress || tasks.some(t => t.completionPercentage > 0)) phaseStatus = 'IN_PROGRESS';

  await prisma.phase.update({
    where: { id: phaseId },
    data: { status: phaseStatus },
  });
};

export const updateTaskProgress = async (req, res) => {
  const { id } = req.params;
  const { completionPercentage } = req.body;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        completionPercentage: Number(completionPercentage),
        status: Number(completionPercentage) === 100 ? 'COMPLETED' :
          Number(completionPercentage) > 0 ? 'IN_PROGRESS' : 'TODO'
      },
    });

    if (task.phaseId) {
      await recalculatePhaseProgress(task.phaseId);
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ error: 'Failed to update task progress' });
  }
};

export const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    let completionPercentage = undefined;
    if (status === 'COMPLETED') completionPercentage = 100;
    else if (status === 'TODO') completionPercentage = 0;

    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        ...(completionPercentage !== undefined && { completionPercentage })
      },
    });

    if (task.phaseId) {
      await recalculatePhaseProgress(task.phaseId);
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};
