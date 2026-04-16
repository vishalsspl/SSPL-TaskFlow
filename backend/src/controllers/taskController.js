import { sendTaskAssignmentEmail, sendTaskStatusUpdateEmail } from '../services/emailService.js';
import { createNotification } from '../utils/notifications.js';
import prisma from '../lib/prisma.js';


export const getAllTasks = async (req, res) => {
  const { projectId, status, priority, type, assignedTo, search, page, limit: rawLimit } = req.query;

  const where = {
    project: {
      organizationId: req.user.organizationId,
    },
  };

  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (assignedTo) {
    where.assignees = { some: { userId: assignedTo } };
  }

  // Backend search filter
  if (search) {
    where.OR = [
      ...(where.OR || []),
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // If Manager, restrict visibility
  if (req.user.role === 'MANAGER') {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { project: { managerId: req.user.id } },
          { assignees: { some: { userId: req.user.id } } },
        ],
      },
    ];
  }

  // If Client, only show tasks from their projects
  if (req.user.role === 'CLIENT') {
    where.project = { ...where.project, clientId: req.user.id };
  }

  const include = {
    assignees: {
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    },
    project: { select: { id: true, name: true } },
    phase: { select: { id: true, name: true } },
  };

  // If page is provided, return paginated response
  if (page) {
    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.max(1, parseInt(rawLimit) || 10);
    const skip = (pageNum - 1) * limit;

    const [tasks, total] = await Promise.all([
      req.db.task.findMany({
        where,
        include,
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
      req.db.task.count({ where }),
    ]);

    return res.json({
      data: tasks,
      pagination: {
        total,
        page: pageNum,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  // No pagination - return all (backward compat for Kanban/dropdowns)
  const tasks = await req.db.task.findMany({
    where,
    include,
    orderBy: { title: 'asc' },
  });

  res.json(tasks);
};

export const getTask = async (req, res) => {
  const { id } = req.params;

  const task = await req.db.task.findFirst({
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
    storyPoints,
    type,
    sendEmail = true,
  } = req.body;

  if (!projectId || !title) {
    return res.status(400).json({ error: 'Project ID and title are required' });
  }

  // Check if title starts with a number
  if (/^\d/.test(title.trim())) {
    return res.status(400).json({ error: 'Task title cannot start with a number' });
  }

  if (!/^[a-zA-Z0-9\s]+$/.test(title)) {
    return res.status(400).json({ error: 'Task title cannot contain special characters. Only alphanumeric characters and spaces are allowed.' });
  }

  // Check for duplicate task title in the same project
  const existingTask = await req.db.task.findFirst({
    where: {
      title: { equals: title.trim(), mode: 'insensitive' },
      projectId: projectId
    }
  });

  if (existingTask) {
    return res.status(400).json({ error: 'A task with this title already exists in this project' });
  }

  // Validate due date is not in the past
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDueDate = new Date(dueDate);
    if (taskDueDate < today) {
      return res.status(400).json({ error: 'Due date cannot be in the past' });
    }
  }

  const project = await req.db.project.findFirst({
    where: { id: projectId, organizationId: req.user.organizationId },
  });
  if (!project) return res.status(404).json({ error: 'Project not found in your organization' });

  // Validate phaseId belongs to the same project (and thus same org)
  if (phaseId) {
    const phase = await req.db.phase.findFirst({
      where: { id: phaseId, projectId: projectId }
    });
    if (!phase) return res.status(400).json({ error: 'Invalid phase for this project' });
  }

  // Validate assignees belong to the same organization
  if (assigneeIds && assigneeIds.length > 0) {
    const validUsersCount = await req.db.user.count({
      where: {
        id: { in: assigneeIds },
        organizationId: req.user.organizationId
      }
    });
    if (validUsersCount !== assigneeIds.length) {
      return res.status(400).json({ error: 'One or more assignees do not belong to your organization' });
    }
  }

  const task = await req.db.task.create({
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
      storyPoints: storyPoints ? parseInt(storyPoints) : 0,
      type: type || 'TASK',
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

  // Log activity
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId,
      action: 'CREATED',
      entity: 'task',
      entityId: task.id,
      details: { title: task.title },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[CreateTask] Failed to log activity:', logErr.message);
  }

  // Send email to all assignees
  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  if (hasEmailSupport && sendEmail) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    const senderName = req.user.name;
    for (const { user } of task.assignees) {
      if (user?.email) {
        sendTaskAssignmentEmail(
          user.email,
          task.title,
          task.project.name,
          senderName,
          { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description, baseUrl: origin }
        ).catch(err => console.error('Failed to send task assignment email:', err));
      }

      createNotification(req, {
        userId: user.id,
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${task.title} in project: ${task.project.name}`,
        type: 'TASK_ASSIGNED',
      });
    }
  }

  if (task.phaseId) {
    await recalculatePhaseProgress(req.db, task.phaseId);
  }

  res.status(201).json(task);
};

// ── bulkCreateTasks ──────────────────────────────────────────────────────
export const bulkCreateTasks = async (req, res) => {
  const { tasks: taskList } = req.body;
  const organizationId = req.user.organizationId;

  if (!Array.isArray(taskList) || taskList.length === 0) {
    return res.status(400).json({ error: 'A non-empty array of tasks is required.' });
  }

  if (taskList.length > 200) {
    return res.status(400).json({ error: 'Maximum 200 tasks can be imported at once.' });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  for (let i = 0; i < taskList.length; i++) {
    const row = taskList[i];
    const rowNum = i + 1;
    const {
      projectName,
      phaseName,
      title,
      description,
      assigneeEmails, // comma string
      status,
      priority,
      storyPoints,
      dueDate,
      tags,
      type,
      sendEmail = true
    } = row;

    // ── Basic Validation ──
    if (!projectName || !title) {
      results.push({ row: rowNum, title: title || '(empty)', status: 'FAILED', error: 'Project name and task title are required.' });
      failCount++;
      continue;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(title)) {
      results.push({ row: rowNum, title, status: 'FAILED', error: 'Title cannot contain special characters.' });
      failCount++;
      continue;
    }

    try {
      // 1. Lookup Project
      const project = await req.db.project.findFirst({
        where: { name: { equals: projectName.trim(), mode: 'insensitive' }, organizationId }
      });
      if (!project) {
        results.push({ row: rowNum, title, status: 'FAILED', error: `Project "${projectName}" not found.` });
        failCount++;
        continue;
      }

      // 2. Check duplicate title in same project
      const existing = await req.db.task.findFirst({
        where: { title: { equals: title.trim(), mode: 'insensitive' }, projectId: project.id }
      });
      if (existing) {
        results.push({ row: rowNum, title, status: 'FAILED', error: `A task with this title already exists in project "${projectName}".` });
        failCount++;
        continue;
      }

      // 3. Lookup Phase
      let phaseId = null;
      if (phaseName) {
        const phase = await req.db.phase.findFirst({
          where: { name: { equals: phaseName.trim(), mode: 'insensitive' }, projectId: project.id }
        });
        if (phase) phaseId = phase.id;
        else {
          // Optional: fail if phase not found, or just ignore? Let's ignore it for now or log warning.
          // For now, if provided and not found, we'll just not assign a phase.
        }
      }

      // 4. Lookup Assignees
      let assigneeIds = [];
      if (assigneeEmails) {
        const emails = assigneeEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
        const users = await req.db.user.findMany({
          where: { email: { in: emails }, organizationId }
        });
        assigneeIds = users.map(u => u.id);
      }

      // ── Normalize Data ──
      let parsedDueDate = null;
      if (dueDate) {
        const d = new Date(dueDate);
        if (!isNaN(d.getTime())) parsedDueDate = d;
      }

      // Story Points (Handle non-numeric strings)
      let parsedPoints = 0;
      if (storyPoints !== undefined && storyPoints !== null && storyPoints !== '') {
        const cleanPoints = String(storyPoints).replace(/[^0-9]/g, '');
        parsedPoints = parseInt(cleanPoints) || 0;
      }

      // Validate Enums
      const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED'];
      let normalizedStatus = (status || 'TODO').toUpperCase().trim();
      if (!validStatuses.includes(normalizedStatus)) normalizedStatus = 'TODO';

      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      let normalizedPriority = (priority || 'MEDIUM').toUpperCase().trim();
      if (!validPriorities.includes(normalizedPriority)) normalizedPriority = 'MEDIUM';

      const validTypes = ['TASK', 'BUG', 'STORY', 'EPIC', 'SUBTASK'];
      let normalizedType = (type || 'TASK').toUpperCase().trim();
      if (!validTypes.includes(normalizedType)) normalizedType = 'TASK';

      // 5. Create Task
      const task = await req.db.task.create({
        data: {
          projectId: project.id,
          phaseId,
          title: title.trim(),
          description: description || null,
          status: normalizedStatus,
          priority: normalizedPriority,
          storyPoints: parsedPoints,
          dueDate: parsedDueDate,
          tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
          type: normalizedType,
          assignees: {
            create: assigneeIds.map(userId => ({ userId }))
          }
        },
        include: {
          assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
          project: { select: { id: true, name: true } },
        }
      });


      // Activity Logging
      try {
        const logData = {
          userId: req.user.id,
          organizationId,
          projectId: project.id,
          action: 'CREATED',
          entity: 'task',
          entityId: task.id,
          details: { title: task.title, bulkImport: true },
        };
        await req.db.activityLog.create({ data: logData });
        await prisma.activityLog.create({ data: logData });
      } catch (logErr) { }

      // Notifications
      if (hasEmailSupport && sendEmail) {
        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        const senderName = req.user.name;
        for (const { user } of task.assignees) {
          if (user?.email) {
            sendTaskAssignmentEmail(user.email, task.title, task.project.name, senderName, {
              priority: task.priority,
              dueDate: task.dueDate,
              status: task.status,
              description: task.description,
              baseUrl: origin
            }).catch(() => { });
          }
          createNotification(req, {
            userId: user.id,
            title: 'New Task Assigned (Bulk)',
            message: `You have been assigned to task: ${task.title} in project: ${task.project.name}`,
            type: 'TASK_ASSIGNED',
          });
        }
      }

      // Recalculate Phase Progress
      if (task.phaseId) {
        await recalculatePhaseProgress(req.db, task.phaseId);
      }

      results.push({ row: rowNum, title: task.title, status: 'SUCCESS' });
      successCount++;

    } catch (err) {
      results.push({ row: rowNum, title, status: 'FAILED', error: err.message });
      failCount++;
    }
  }

  res.status(200).json({
    message: `Import complete. ${successCount} succeeded, ${failCount} failed.`,
    summary: { total: taskList.length, success: successCount, failed: failCount },
    results,
  });
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
    storyPoints,
    type,
    sendEmail = true,
  } = req.body;

  const existingTask = await req.db.task.findFirst({
    where: { id, project: { organizationId: req.user.organizationId } },
    include: { assignees: { include: { user: true } } },
  });
  if (!existingTask) return res.status(404).json({ error: 'Task not found' });

  if (title !== undefined && !/^[a-zA-Z0-9\s]+$/.test(title)) {
    return res.status(400).json({ error: 'Task name cannot contain special characters. Only alphanumeric characters and spaces are allowed.' });
  }

  // Validate due date is not in the past ONLY if it's being changed to a new date
  if (dueDate && new Date(dueDate).toISOString() !== new Date(existingTask.dueDate).toISOString()) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDueDate = new Date(dueDate);
    if (taskDueDate < today) {
      return res.status(400).json({ error: 'Due date cannot be in the past' });
    }
  }

  const existingAssigneeIds = existingTask.assignees.map((a) => a.userId);
  const newAssigneeIds = assigneeIds !== undefined ? assigneeIds : existingAssigneeIds;

  // Validate new projectId or phaseId if changed
  if (phaseId && phaseId !== existingTask.phaseId) {
    const phase = await req.db.phase.findFirst({
      where: { id: phaseId, projectId: existingTask.projectId }
    });
    if (!phase) return res.status(400).json({ error: 'Invalid phase for this project' });
  }

  // Validate new assignees belong to the same organization
  if (assigneeIds !== undefined && assigneeIds.length > 0) {
    const validUsersCount = await req.db.user.count({
      where: {
        id: { in: assigneeIds },
        organizationId: req.user.organizationId
      }
    });
    if (validUsersCount !== assigneeIds.length) {
      return res.status(400).json({ error: 'One or more assignees do not belong to your organization' });
    }
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
      tags,
      phaseId,
      storyPoints: storyPoints !== undefined ? (storyPoints ? parseInt(storyPoints) : 0) : undefined,
      type: type !== undefined ? type : undefined,
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

  // Log activity
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: task.projectId,
      action: 'UPDATED',
      entity: 'task',
      entityId: task.id,
      details: { title: task.title, changes: req.body },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[UpdateTask] Failed to log activity:', logErr.message);
  }

  // Email newly added assignees
  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  if (hasEmailSupport && sendEmail && addedIds.length > 0) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    const senderName = req.user.name;
    for (const { user } of task.assignees.filter((a) => addedIds.includes(a.userId))) {
      if (user?.email) {
        sendTaskAssignmentEmail(
          user.email,
          task.title,
          task.project.name,
          senderName,
          { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description, baseUrl: origin }
        ).catch(err => console.error('Failed to send task assignment email:', err));
      }

      createNotification(req, {
        userId: user.id,
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${task.title} in project: ${task.project.name}`,
        type: 'TASK_ASSIGNED',
      });
    }
  }

  // Email assignees if status changed by Manager or Admin
  if (hasEmailSupport && sendEmail && status && status !== existingTask.status && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    const updatedBy = req.user.name;
    for (const { user } of task.assignees) {
      if (user?.email) {
        sendTaskStatusUpdateEmail(
          user.email,
          task.title,
          task.project.name,
          task.status,
          updatedBy,
          origin
        ).catch(err => console.error('Failed to send task status update email:', err));
      }

      let notificationType = 'TASK_STATUS_UPDATED';
      let notificationTitle = 'Task Status Updated';
      let notificationMessage = `Task "${task.title}" status has been updated to ${task.status} by ${updatedBy}`;

      // Specific logic for Approval/Rejection
      if (existingTask.status === 'IN_REVIEW') {
        if (status === 'COMPLETED') {
          notificationType = 'TASK_APPROVED';
          notificationTitle = 'Task Approved 🎉';
          notificationMessage = `Your task "${task.title}" has been approved by ${updatedBy}. Great job!`;
        } else if (status === 'TODO' || status === 'IN_PROGRESS') {
          notificationType = 'TASK_REJECTED';
          notificationTitle = 'Task Needs Changes ⚠️';
          notificationMessage = `Your task "${task.title}" was moved back to ${status} by ${updatedBy}. Please review the feedback.`;
        }
      }

      createNotification(req, {
        userId: user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
      });
    }
  }

  // Sync phase progress if phase changed or status/points changed
  if (phaseId !== undefined || status !== existingTask.status || storyPoints !== existingTask.storyPoints) {
    if (existingTask.phaseId) await recalculatePhaseProgress(req.db, existingTask.phaseId);
    if (task.phaseId && task.phaseId !== existingTask.phaseId) await recalculatePhaseProgress(req.db, task.phaseId);
  }

  res.json(task);
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;

  // Verify task belongs to user's organization
  const existingTask = await req.db.task.findFirst({
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

  // Log deletion BEFORE deleting from database
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: existingTask.projectId,
      action: 'DELETED',
      entity: 'task',
      entityId: id,
      details: { title: existingTask.title },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[DeleteTask] Failed to log activity:', logErr.message);
  }

  await req.db.task.delete({
    where: { id },
  });

  if (existingTask.phaseId) {
    await recalculatePhaseProgress(req.db, existingTask.phaseId);
  }

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

    const tasks = await req.db.task.findMany({
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
        { title: 'asc' },
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};
const recalculatePhaseProgress = async (db, phaseId) => {
  if (!phaseId) return;

  const tasks = await db.task.findMany({
    where: { phaseId },
    select: { status: true, storyPoints: true, completionPercentage: true },
  });

  if (tasks.length === 0) {
    await db.phase.update({
      where: { id: phaseId },
      data: { completionPercentage: 0, status: 'WAITING' },
    });
    return;
  }

  // Calculate story point progress: (Completed Pts / Total Pts) * 100
  const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
  const completedStoryPoints = tasks
    .filter((task) => task.status === 'COMPLETED')
    .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  let progress = 0;
  if (totalStoryPoints > 0) {
    progress = Math.round((completedStoryPoints / totalStoryPoints) * 100);
  } else {
    // Fallback to task count if no story points are defined
    const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
    progress = Math.round((completedCount / tasks.length) * 100);
  }

  // Determine phase status
  const allCompleted = tasks.every(t => t.status === 'COMPLETED');
  const anyStarted = tasks.some(t => t.status !== 'TODO');

  let phaseStatus = 'WAITING';
  if (allCompleted) phaseStatus = 'COMPLETED';
  else if (anyStarted) phaseStatus = 'IN_PROGRESS';

  await db.phase.update({
    where: { id: phaseId },
    data: {
      completionPercentage: progress,
      status: phaseStatus
    },
  });
};

export const updateTaskProgress = async (req, res) => {
  const { id } = req.params;
  const { completionPercentage } = req.body;

  try {
    // Verify task belongs to user's organization
    const existingTask = await req.db.task.findFirst({
      where: { id, project: { organizationId: req.user.organizationId } }
    });
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    const task = await req.db.task.update({
      where: { id },
      data: {
        completionPercentage: Number(completionPercentage),
        status: Number(completionPercentage) === 100 ? 'COMPLETED' :
          Number(completionPercentage) > 0 ? 'IN_PROGRESS' : 'TODO'
      },
    });

    if (task.phaseId) {
      await recalculatePhaseProgress(req.db, task.phaseId);
    }

    // Log activity
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: task.projectId,
        action: 'UPDATED',
        entity: 'task',
        entityId: task.id,
        details: {
          title: task.title,
          action: 'Progress Updated',
          completionPercentage: Number(completionPercentage)
        },
      };

      // 1. Log to tenant DB
      await req.db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[UpdateTaskProgress] Failed to log activity:', logErr.message);
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ error: 'Failed to update task progress' });
  }
};

export const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, sendEmail = true } = req.body;

  try {
    // Verify task belongs to user's organization
    const existingTask = await req.db.task.findFirst({
      where: { id, project: { organizationId: req.user.organizationId } }
    });
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    let completionPercentage = undefined;
    if (status === 'COMPLETED') completionPercentage = 100;
    else if (status === 'TODO') completionPercentage = 0;

    const task = await req.db.task.update({
      where: { id },
      data: {
        status,
        ...(completionPercentage !== undefined && { completionPercentage })
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        project: { select: { name: true } },
      },
    });

    if (task.phaseId) {
      await recalculatePhaseProgress(req.db, task.phaseId);
    }

    // Log activity
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: task.projectId,
        action: 'UPDATED',
        entity: 'task',
        entityId: task.id,
        details: {
          title: task.title,
          action: 'Status Updated',
          status,
          oldStatus: existingTask.status
        },
      };

      // 1. Log to tenant DB
      await req.db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[UpdateTaskStatus] Failed to log activity:', logErr.message);
    }

    // Email assignees if status changed by Manager or Admin
    const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

    if (hasEmailSupport && sendEmail && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const updatedBy = req.user.name;
      for (const { user } of task.assignees) {
        if (user?.email) {
          sendTaskStatusUpdateEmail(
            user.email,
            task.title,
            task.project.name,
            task.status,
            updatedBy
          ).catch(err => console.error('Failed to send task status update email:', err));
        }

        let notificationType = 'TASK_STATUS_UPDATED';
        let notificationTitle = 'Task Status Updated';
        let notificationMessage = `Task "${task.title}" status has been updated to ${task.status} by ${updatedBy}`;

        // Specific logic for Approval/Rejection
        if (existingTask.status === 'IN_REVIEW') {
          if (status === 'COMPLETED') {
            notificationType = 'TASK_APPROVED';
            notificationTitle = 'Task Approved 🎉';
            notificationMessage = `Your task "${task.title}" has been approved by ${updatedBy}. Great job!`;
          } else if (status === 'TODO' || status === 'IN_PROGRESS') {
            notificationType = 'TASK_REJECTED';
            notificationTitle = 'Task Needs Changes ⚠️';
            notificationMessage = `Your task "${task.title}" was moved back to ${status} by ${updatedBy}. Please review the feedback.`;
          }
        }

        createNotification(req, {
          userId: user.id,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
        });
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};
