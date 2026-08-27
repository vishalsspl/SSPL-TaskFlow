import { sendTaskAssignmentEmail, sendTaskStatusUpdateEmail, sendTaskUpdateEmail, sendTaskDeleteEmail, sendTaskCommentEmail, sendManagerTaskCreatedEmail } from '../services/emailService.js';
import { createNotification, shouldSendEmail } from '../utils/notifications.js';
import prisma from '../lib/prisma.js';


export const getAllTasks = async (req, res) => {
  try {
    // ── Check for tenant DB connection errors ─────────────────────────────
    if (req.tenantDbError) {
      return res.status(503).json({
        error: 'Organization database connection failed',
        message: 'We are having trouble connecting to your organization database.',
        details: process.env.NODE_ENV === 'development' ? req.tenantDbError : undefined
      });
    }

    // ── Verify model existence ────────────────────────────────────────────
    if (!req.db || !req.db.task) {
      if (req.user.role === 'SUPERADMIN') return res.json([]);
      return res.status(500).json({ 
        error: 'Database configuration error',
        message: 'The requested model "Task" is not available.'
      });
    }

    const { projectId, status, excludeStatus, priority, type, assignedTo, search, page, limit: rawLimit, sortBy, sortOrder = 'asc', dueDateFrom, dueDateTo, pointsMin, pointsMax, progressMin, progressMax } = req.query;

  const where = {
    project: {
      organizationId: req.user.organizationId,
    },
  };

  if (projectId) where.projectId = { in: projectId.split(',').map(id => id.trim()).filter(Boolean) };
  if (status) {
    where.status = { in: status.split(',').map(s => s.trim()).filter(Boolean) };
  } else if (excludeStatus) {
    where.status = { notIn: excludeStatus.split(',').map(s => s.trim()).filter(Boolean) };
  }
  
  if (priority) where.priority = { in: priority.split(',').map(p => p.trim()).filter(Boolean) };
  if (type) where.type = { in: type.split(',').map(t => t.trim()).filter(Boolean) };
  if (assignedTo) {
    where.assignees = { some: { userId: { in: assignedTo.split(',').map(id => id.trim()).filter(Boolean) } } };
  }

  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
    if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
  }

  if (pointsMin !== undefined || pointsMax !== undefined) {
    const min = pointsMin !== undefined ? parseInt(pointsMin) : undefined;
    const max = pointsMax !== undefined ? parseInt(pointsMax) : undefined;
    if (!isNaN(min) || !isNaN(max)) {
      where.storyPoints = {};
      if (!isNaN(min)) where.storyPoints.gte = min;
      if (!isNaN(max)) where.storyPoints.lte = max;
    }
  }

  if (progressMin !== undefined || progressMax !== undefined) {
    const pMin = progressMin !== undefined ? parseInt(progressMin) : undefined;
    const pMax = progressMax !== undefined ? parseInt(progressMax) : undefined;
    if (!isNaN(pMin) || !isNaN(pMax)) {
      where.completionPercentage = {};
      if (!isNaN(pMin)) where.completionPercentage.gte = pMin;
      if (!isNaN(pMax)) where.completionPercentage.lte = pMax;
    }
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
          { project: { managers: { some: { id: req.user.id } } } },
          { assignees: { some: { userId: req.user.id } } },
          { 
            AND: [
              { project: { name: { in: ['General', 'General Tasks'] } } },
              { tags: { has: `APPROVER:${req.user.id}` } }
            ]
          }
        ],
      },
    ];
  }

  // If Member, restrict visibility for General project tasks to only their own
  if (req.user.role === 'MEMBER') {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { project: { name: { notIn: ['General', 'General Tasks'] } } },
          {
            AND: [
              { project: { name: { in: ['General', 'General Tasks'] } } },
              {
                OR: [
                  { assignees: { some: { userId: req.user.id } } },
                  { tags: { has: `CREATOR:${req.user.id}` } },
                  { assignees: { some: { assignedById: req.user.id } } }
                ]
              }
            ]
          }
        ]
      }
    ];
  }

  // If Client, only show tasks from their projects
  if (req.user.role === 'CLIENT') {
    where.project = { ...where.project, clientId: req.user.id };
  }

  const include = {
    assignees: { include: { user: { select: { id: true, name: true, email: true, avatar: true } }, assignedBy: { select: { id: true, name: true } } } },
    project: { select: { id: true, name: true, allowMemberTaskCreation: true } },
    phase: { select: { id: true, name: true } },
    parent: { select: { id: true, title: true, type: true, shortId: true } },
  };

  let prismaOrderBy = { title: 'asc' };
  if (sortBy) {
    const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';
    switch (sortBy) {
      case 'title': prismaOrderBy = { title: order }; break;
      case 'project': prismaOrderBy = { project: { name: order } }; break;
      case 'status': prismaOrderBy = { status: order }; break;
      case 'type': prismaOrderBy = { type: order }; break;
      case 'priority': prismaOrderBy = { priority: order }; break;
      case 'points': prismaOrderBy = { storyPoints: order }; break;
      case 'dueDate': prismaOrderBy = { dueDate: order }; break;
    }
  }

  // If page is provided, return paginated response
  if (page) {
    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.max(1, parseInt(rawLimit) || 10);
    const skip = (pageNum - 1) * limit;

    const [tasks, total] = await Promise.all([
      req.db.task.findMany({
        where,
        include,
        orderBy: prismaOrderBy,
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
    orderBy: prismaOrderBy,
  });

  res.json(tasks);
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    try {
      (await import('fs')).appendFileSync('error_log.txt', new Date().toISOString() + ' ' + (error.stack || error.message) + '\n');
    } catch (e) {}
    res.status(500).json({ error: 'Failed to fetch tasks', message: error.message });
  }
};

export const getTask = async (req, res) => {
  const { id } = req.params;

  const task = await req.db.task.findFirst({
    where: { id, project: { organizationId: req.user.organizationId } },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true, avatar: true } }, assignedBy: { select: { id: true, name: true } } } },
      project: { select: { id: true, name: true } },
      phase: true,
      parent: { select: { id: true, title: true, type: true, shortId: true } },
      children: { select: { id: true, title: true, type: true, status: true, shortId: true } },
    },
  });

  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Role-based visibility check for getTask
  if (req.user.role === 'MEMBER' && (task.project?.name === 'General' || task.project?.name === 'General Tasks')) {
      const isAssignee = task.assignees.some(a => a.user.id === req.user.id);
      const isCreator = task.tags?.includes(`CREATOR:${req.user.id}`);
      if (!isAssignee && !isCreator) {
          return res.status(403).json({ error: 'You do not have permission to view this task.' });
      }
  }

  if (req.user.role === 'MANAGER' && (task.project?.name === 'General' || task.project?.name === 'General Tasks')) {
      const isApprover = task.tags?.includes(`APPROVER:${req.user.id}`);
      const isAssignee = task.assignees.some(a => a.user.id === req.user.id);
      const isProjectManager = task.project?.managers?.some(m => m.id === req.user.id);
      if (!isApprover && !isAssignee && !isProjectManager) {
          return res.status(403).json({ error: 'You do not have permission to view this task.' });
      }
  }

  res.json(task);
};


export const createTask = async (req, res) => {
  let {
    projectId,
    phaseId,
    parentId,
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
    attachments = [],
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required and cannot be only blank spaces' });
  }

  // Handle optional project
  if (!projectId) {
     let generalProject = await req.db.project.findFirst({
         where: { 
           name: { in: ['General', 'General Tasks'] }, 
           organizationId: req.user.organizationId 
         },
         include: { managers: { select: { id: true } } }
     });
     if (!generalProject) {
         generalProject = await req.db.project.create({
             data: {
                 name: 'General Tasks',
                 description: 'General organization tasks',
                 organizationId: req.user.organizationId,
                 status: 'ACTIVE',
                 managers: (req.user.role === 'MANAGER') ? { connect: [{ id: req.user.id }] } : undefined,
             }
         });
     } else if ((!generalProject.managers || generalProject.managers.length === 0) && req.user.role === 'MANAGER') {
         // If a General project exists but has no manager, assign this manager
         await req.db.project.update({
             where: { id: generalProject.id },
             data: { managers: { connect: [{ id: req.user.id }] } }
         });
     }
     projectId = generalProject.id;
  }

  // Determine if it's a general/random task to apply special approval routing
  let isGeneralTask = false;
  if (projectId) {
      const proj = await req.db.project.findFirst({ where: { id: projectId } });
      if (proj && (proj.name === 'General' || proj.name === 'General Tasks')) {
          isGeneralTask = true;
      }
  }

  // If it's a random task, determine the approver
  let approverId = null;
  if (isGeneralTask) {
      if (req.user.role === 'MEMBER') {
          const memberUser = await req.db.user.findFirst({ where: { id: req.user.id } });
          if (memberUser && memberUser.managerId) {
              approverId = memberUser.managerId;
          }
      } else if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
          approverId = req.user.id;
      }
  }

  let finalTags = tags || [];
  if (approverId) {
      finalTags.push(`APPROVER:${approverId}`);
  }
  // Explicitly tag the creator so they can see their own unassigned general tasks
  finalTags.push(`CREATOR:${req.user.id}`);

  const trimmedTitle = title.trim();
  if (trimmedTitle.length > 30) {
    return res.status(400).json({ error: 'Task title cannot exceed 30 characters' });
  }

  // Check if title starts with a number
  if (/^\d/.test(trimmedTitle)) {
    return res.status(400).json({ error: 'Task title cannot start with a number' });
  }

  const isAlphanumeric = (char) => /^[a-zA-Z0-9]$/.test(char);
  if (!isAlphanumeric(trimmedTitle[0]) || !isAlphanumeric(trimmedTitle[trimmedTitle.length - 1])) {
    return res.status(400).json({ error: 'Task title cannot start or end with a special character' });
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

  // If project doesn't have a prefix, let's create one based on name
  let prefix = project.prefix;
  if (!prefix) {
    prefix = project.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'TSK';
    await req.db.project.update({ where: { id: project.id }, data: { prefix } });
  }

  // Get next task number
  const maxTask = await req.db.task.findFirst({
    where: { 
      projectId: project.id,
      taskNumber: { not: null }
    },
    orderBy: { taskNumber: 'desc' }
  });
  const taskNumber = (maxTask?.taskNumber || 0) + 1;
  const shortId = `${prefix}-${taskNumber}`;

  // If MEMBER, check if this project allows member task creation
  if (req.user.role === 'MEMBER' && !project.allowMemberTaskCreation) {
    return res.status(403).json({ 
      error: 'You do not have permission to create tasks in this project. Please ask your Manager or Admin to enable task creation for members.' 
    });
  }

  if (req.user.role === 'MEMBER' && status === 'COMPLETED') {
    return res.status(403).json({ error: 'Members cannot create tasks in Completed status.' });
  }

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
      parentId: parentId || null,
      title,
      taskNumber,
      shortId,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      completionPercentage: completionPercentage || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: finalTags,
      storyPoints: storyPoints ? parseInt(storyPoints) : 0,
      type: type || 'TASK',
      attachments,
      assignees: {
        create: (assigneeIds || []).map((userId) => ({ userId, assignedById: req.user.id })),
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
      parent: { select: { id: true, title: true, type: true, shortId: true } },
    },
  });

  // Log activity
  try {
    const assigneeNames = task.assignees?.map(a => a.user?.name).filter(Boolean).join(', ') || 'Unassigned';
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId,
      action: 'CREATED',
      entity: 'task',
      entityId: task.id,
      details: { 
        title: task.title,
        assignedTo: assigneeNames,
        message: `${req.user.name} created task "${task.title}" and assigned it to ${assigneeNames}`
      },
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
  console.log(`[TaskController] Email support active: ${hasEmailSupport}, sendEmail flag: ${sendEmail}`);

  const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
  const senderName = req.user.name;

  for (const { user } of task.assignees) {
    if (user.id !== req.user.id) {
      // 1. Always send in-app notification
      await createNotification(req, {
        userId: user.id,
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${task.title} in project: ${task.project.name}`,
        type: 'TASK_ASSIGNED',
        link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=new`
      });

      // 2. Only send email if enabled, supported, and user has email preference ON
      if (hasEmailSupport && sendEmail && user?.email) {
        const emailAllowed = await shouldSendEmail(req.db, user.id, 'TASK_ASSIGNED');
        if (emailAllowed) {
          sendTaskAssignmentEmail(
            user.email,
            task.title,
            task.project.name,
            senderName,
            { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description, baseUrl: origin }
          ).catch(err => console.error('Failed to send task assignment email:', err));
        }
      }
    }
  }

  if (req.user.role === 'MEMBER') {
    const creator = await req.db.user.findUnique({
      where: { id: req.user.id },
      include: { manager: true }
    });
    
    // Notify member's direct manager
    if (creator?.manager) {
      // In-app notification
      await createNotification(req, {
        userId: creator.manager.id,
        title: 'New Task Created',
        message: `${req.user.name} created a new task "${task.title}" in project: ${task.project.name}`,
        type: 'TASK_ASSIGNED',
        link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=new`
      });

      // Email notification
      if (hasEmailSupport && sendEmail && creator.manager.email && (await shouldSendEmail(req.db, creator.manager.id, 'TASK_ASSIGNED'))) {
        sendManagerTaskCreatedEmail(
          creator.manager.email,
          creator.manager.name,
          req.user.name,
          task.title,
          task.project.name,
          origin
        ).catch(err => console.error('Failed to send manager task created email:', err));
      }
    }

    // Notify project managers if they exist and are different from the direct manager
    const fullProject = await req.db.project.findUnique({
      where: { id: projectId },
      include: { managers: true }
    });

    if (fullProject?.managers && fullProject.managers.length > 0) {
      for (const m of fullProject.managers) {
        if (m.id !== creator?.manager?.id) {
          // In-app notification
          await createNotification(req, {
            userId: m.id,
            title: 'New Task Created',
            message: `${req.user.name} created a new task "${task.title}" in project: ${task.project.name}`,
            type: 'TASK_ASSIGNED',
            link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=new`
          });

          // Email notification
          if (hasEmailSupport && sendEmail && m.email && (await shouldSendEmail(req.db, m.id, 'TASK_ASSIGNED'))) {
            sendManagerTaskCreatedEmail(
              m.email,
              m.name,
              req.user.name,
              task.title,
              task.project.name,
              origin
            ).catch(err => console.error('Failed to send project manager task created email:', err));
          }
        }
      }
    }
  }

  // When ADMIN creates a task, notify ALL project managers
  if (hasEmailSupport && sendEmail && req.user.role === 'ADMIN') {
    const fullProject = await req.db.project.findUnique({
      where: { id: projectId },
      include: { managers: { select: { id: true, name: true, email: true } } }
    });

    if (fullProject?.managers && fullProject.managers.length > 0) {
      for (const m of fullProject.managers) {
        // In-app notification
        await createNotification(req, {
          userId: m.id,
          title: 'New Task Created',
          message: `${req.user.name} created a new task "${task.title}" in project: ${task.project.name}`,
          type: 'TASK_ASSIGNED',
          link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=new`
        });

        // Email notification
        if (m.email) {
          const emailAllowed = await shouldSendEmail(req.db, m.id, 'TASK_ASSIGNED');
          if (emailAllowed) {
            sendManagerTaskCreatedEmail(
              m.email,
              m.name,
              req.user.name,
              task.title,
              task.project.name,
              origin
            ).catch(err => console.error('Failed to send project manager task created email:', err));
          }
        }
      }
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
    if (!projectName || !title || !String(title).trim()) {
      results.push({ row: rowNum, title: title || '(empty)', status: 'FAILED', error: 'Project name and task title are required and cannot be empty.' });
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
        const emails = [...new Set(assigneeEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e))];
        if (emails.length > 0) {
          const users = await req.db.user.findMany({
            where: { email: { in: emails }, organizationId }
          });
          
          if (users.length !== emails.length) {
            const foundEmails = users.map(u => u.email.toLowerCase());
            const notFoundEmails = emails.filter(e => !foundEmails.includes(e));
            results.push({ row: rowNum, title, status: 'FAILED', error: `Assignee email(s) not registered: ${notFoundEmails.join(', ')}` });
            failCount++;
            continue;
          }
          assigneeIds = users.map(u => u.id);
        }
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

      // 4.5 Generate shortId
      let prefix = project.prefix;
      if (!prefix) {
        prefix = project.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'TSK';
        await req.db.project.update({ where: { id: project.id }, data: { prefix } });
        project.prefix = prefix;
      }
      const maxTask = await req.db.task.findFirst({
        where: { 
          projectId: project.id,
          taskNumber: { not: null }
        },
        orderBy: { taskNumber: 'desc' }
      });
      const taskNumber = (maxTask?.taskNumber || 0) + 1;
      const shortId = `${prefix}-${taskNumber}`;

      // 5. Create Task
      const task = await req.db.task.create({
        data: {
          projectId: project.id,
          phaseId,
          title: title.trim(),
          taskNumber,
          shortId,
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
          assignees: { include: { user: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true } } } },
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
          if (user.id !== req.user.id) {
            if (user?.email && (await shouldSendEmail(req.db, user.id, 'TASK_ASSIGNED'))) {
              sendTaskAssignmentEmail(user.email, task.title, task.project.name, senderName, {
                priority: task.priority,
                dueDate: task.dueDate,
                status: task.status,
                description: task.description,
                baseUrl: origin
              }).catch(() => { });
            }
            await createNotification(req, {
              userId: user.id,
              title: 'New Task Assigned (Bulk)',
              message: `You have been assigned to task: ${task.title} in project: ${task.project.name}`,
              type: 'TASK_ASSIGNED',
              link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=new`
            });
          }
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
    parentId,
    storyPoints,
    type,
    sendEmail = true,
    attachments,
  } = req.body;

  const existingTask = await req.db.task.findFirst({
    where: { id, project: { organizationId: req.user.organizationId } },
    include: { assignees: { include: { user: true } } },
  });
  if (!existingTask) return res.status(404).json({ error: 'Task not found' });

  if (title !== undefined) {
    const trimmedTitle = String(title).trim();
    if (!trimmedTitle) {
      return res.status(400).json({ error: 'Task title cannot be empty or contain only blank spaces.' });
    }
    if (trimmedTitle.length > 30) {
      return res.status(400).json({ error: 'Task title cannot exceed 30 characters' });
    }
    if (/^\d/.test(trimmedTitle)) {
      return res.status(400).json({ error: 'Task title cannot start with a number' });
    }
    const isAlphanumeric = (char) => /^[a-zA-Z0-9]$/.test(char);
    if (!isAlphanumeric(trimmedTitle[0]) || !isAlphanumeric(trimmedTitle[trimmedTitle.length - 1])) {
      return res.status(400).json({ error: 'Task title cannot start or end with a special character' });
    }
  }

  // Validate due date is not in the past ONLY if it's being changed to a new date
  let isDueDateChanged = false;
  if (dueDate) {
    if (!existingTask.dueDate) {
      isDueDateChanged = true;
    } else {
      const oldDate = new Date(existingTask.dueDate);
      const newDate = new Date(dueDate);
      if (oldDate.getFullYear() !== newDate.getFullYear() || oldDate.getMonth() !== newDate.getMonth() || oldDate.getDate() !== newDate.getDate()) {
        isDueDateChanged = true;
      }
    }
  }

  if (isDueDateChanged) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDueDate = new Date(dueDate);
    taskDueDate.setHours(0, 0, 0, 0);
    if (taskDueDate < today) {
      return res.status(400).json({ error: 'Due date cannot be in the past' });
    }
  }

  if (req.user.role === 'MEMBER' && status === 'COMPLETED') {
    return res.status(403).json({ error: 'Members cannot move tasks directly to Completed.' });
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

  let updatedTags = tags !== undefined ? [...tags] : undefined;
  if (status === 'COMPLETED' && (existingTask.status === 'IN_REVIEW' || existingTask.tags?.some(t => t.startsWith('PENDING_APPROVAL:')))) {
    if (!updatedTags) updatedTags = [...(existingTask.tags || [])];
    updatedTags = updatedTags.filter(t => !t.startsWith('APPROVED_BY:'));
    updatedTags.push(`APPROVED_BY:${req.user.name}`);
  }

  const task = await req.db.task.update({
    where: { id },
    data: {
      title,
      description,
      status,
      priority,
      completionPercentage,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      tags: updatedTags,
      phaseId: phaseId === '' ? null : phaseId,
      parentId: parentId === '' ? null : (parentId !== undefined ? parentId : undefined),
      storyPoints: storyPoints !== undefined ? (storyPoints ? parseInt(storyPoints) : 0) : undefined,
      type: type !== undefined ? type : undefined,
      attachments: attachments !== undefined ? attachments : undefined,
      ...(assigneeIds !== undefined && {
        assignees: {
          deleteMany: {},
          create: newAssigneeIds.map((userId) => ({ userId, assignedById: req.user.id })),
        },
      }),
    },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      project: { select: { id: true, name: true, managers: true } },
      phase: { select: { id: true, name: true } },
      parent: { select: { id: true, title: true, type: true, shortId: true } },
    },
  });

  // Log activity
  try {
    const assigneeNames = task.assignees?.map(a => a.user?.name).filter(Boolean).join(', ') || 'Unassigned';
    
    // Check if assignees actually changed to log a specific message
    const assigneesChanged = addedIds.length > 0 || existingAssigneeIds.filter(id => !newAssigneeIds.includes(id)).length > 0;
    
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: task.projectId || task.project?.id || existingTask?.projectId || null,
      action: 'UPDATED',
      entity: 'task',
      entityId: task.id,
      details: { 
        title: task.title, 
        projectName: task.project?.name || null, 
        changes: req.body,
        assignedTo: assigneeNames,
        ...(assigneesChanged ? { message: `${req.user.name} updated assignees. Task is now assigned to ${assigneeNames}` } : {})
      },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[UpdateTask] Failed to log activity:', logErr.message);
  }

  // Always send internal notifications to newly added assignees
  if (addedIds.length > 0) {
    for (const { user } of task.assignees.filter((a) => addedIds.includes(a.userId))) {
      if (user.id !== req.user.id) {
        await createNotification(req, {
          userId: user.id,
          title: 'New Task Assigned',
          message: `You have been assigned to task: ${task.title} in project: ${task.project.name}`,
          type: 'TASK_ASSIGNED',
          link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=new`
        });
      }
    }
  }

  // Always send internal notifications for status changes (Manager or Admin)
  if (status && status !== existingTask.status && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
    const updatedBy = req.user.name;
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;

    let notificationType = 'TASK_STATUS_UPDATED';
    let notificationTitle = 'Task Status Updated';
    let notificationMessage = `Task "${task.title}" status has been updated to ${task.status} by ${updatedBy}`;

    // Specific logic for Approval/Rejection
    if (existingTask.status === 'IN_REVIEW') {
      if (status === 'COMPLETED') {
        notificationType = 'TASK_APPROVED';
        notificationTitle = `Task Approved by ${updatedBy} 🎉`;
        notificationMessage = `Your task "${task.title}" has been approved by ${updatedBy}. Great job!`;
      } else if (status === 'TODO' || status === 'IN_PROGRESS') {
        notificationType = 'TASK_REJECTED';
        notificationTitle = `Task Needs Changes ⚠️`;
        notificationMessage = `Your task "${task.title}" was moved back to ${status} by ${updatedBy}. Please review the feedback.`;
      }
    }

    // 1. Notify assignees
    for (const { user } of task.assignees) {
      await createNotification(req, {
        userId: user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        link: '/task-board'
      });
    }

    // 2. Notify co-managers if it was an approval
    if (task.project?.managers) {
      const coManagers = task.project.managers.filter(m => m.id !== req.user.id);
      for (const manager of coManagers) {
        await createNotification(req, {
          userId: manager.id,
          title: `Task Approved by ${updatedBy} 🎉`,
          message: `${updatedBy} approved task "${task.title}".`,
          type: 'TASK_APPROVED',
          link: '/task-board'
        });
        
        if (req.user.activeFeatures?.emailsupport !== false && manager.email) {
          const emailAllowed = await shouldSendEmail(req.db, manager.id, notificationType === 'TASK_APPROVED' ? 'TASK_APPROVED' : 'TASK_STATUS_UPDATED');
          if (emailAllowed) {
            sendTaskStatusUpdateEmail(
              manager.email,
              task.title,
              task.project.name,
              task.status,
              updatedBy,
              null,
              origin
            ).catch(err => console.error('Failed to send task status email to co-manager:', err));
          }
        }
      }
    }
  }

  // Email newly added assignees
  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  if (hasEmailSupport && sendEmail && addedIds.length > 0) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    const senderName = req.user.name;
    for (const { user } of task.assignees.filter((a) => addedIds.includes(a.userId))) {
      if (user.id !== req.user.id && user?.email && (await shouldSendEmail(req.db, user.id, 'TASK_ASSIGNED'))) {
        sendTaskAssignmentEmail(
          user.email,
          task.title,
          task.project.name,
          senderName,
          { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description, baseUrl: origin }
        ).catch(err => console.error('Failed to send task assignment email:', err));
      }
    }
  }

  // Email assignees for status changes or generic updates
  const isStatusChanged = status && status !== existingTask.status && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER');
  
  if (hasEmailSupport && sendEmail) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    const updatedBy = req.user.name;
    for (const { user } of task.assignees) {
      if (user?.email) {
        // Skip newly added assignees because they already received the Assignment Email
        if (addedIds.includes(user.id)) continue;

        if (isStatusChanged && (await shouldSendEmail(req.db, user.id, 'TASK_STATUS_UPDATED'))) {
          sendTaskStatusUpdateEmail(
            user.email,
            task.title,
            task.project.name,
            task.status,
            updatedBy,
            origin
          ).catch(err => console.error('Failed to send task status update email:', err));
        } else {
          sendTaskUpdateEmail(
            user.email,
            task.title,
            task.project.name,
            updatedBy,
            { priority: task.priority, dueDate: task.dueDate, status: task.status, description: task.description, baseUrl: origin }
          ).catch(err => console.error('Failed to send task update email:', err));
        }
      }
    }
  }

  // Notify Manager(s) if a MEMBER changes the task status
  if (status && status !== existingTask.status && req.user.role === 'MEMBER') {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    const updatedBy = req.user.name;

    const [member, fullProject] = await Promise.all([
      req.db.user.findUnique({ where: { id: req.user.id }, include: { manager: true } }),
      req.db.project.findUnique({ where: { id: task.projectId }, include: { managers: true } })
    ]);

    const managersToNotify = [];
    if (member?.manager) managersToNotify.push(member.manager);
    if (fullProject?.managers && fullProject.managers.length > 0) {
      for (const m of fullProject.managers) {
        if (m.id !== member?.manager?.id) {
          managersToNotify.push(m);
        }
      }
    }

    for (const manager of managersToNotify) {
      // In-app notification
      await createNotification(req, {
        userId: manager.id,
        title: 'Task Status Updated',
        message: `Task "${task.title}" status has been updated to ${task.status} by ${updatedBy}`,
        type: 'TASK_STATUS_UPDATED',
        link: `/task-board?project=${task.projectId}&highlight=${task.id}`
      });

      // Email notification
      if (hasEmailSupport && sendEmail && manager.email) {
        const emailAllowed = await shouldSendEmail(req.db, manager.id, 'TASK_STATUS_UPDATED');
        if (emailAllowed) {
          sendTaskStatusUpdateEmail(
            manager.email,
            task.title,
            task.project.name,
            task.status,
            updatedBy,
            origin
          ).catch(err => console.error('Failed to send task status update email to manager:', err));
        }
      }
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
    include: {
      assignees: { include: { user: true } },
      project: { select: { name: true } }
    }
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

  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  for (const { user } of existingTask.assignees) {
    // Always send internal notification
    await createNotification(req, {
      userId: user.id,
      title: 'Task Deleted',
      message: `The task "${existingTask.title}" has been deleted from project ${existingTask.project.name}.`,
      type: 'TASK_DELETED',
    });

    if (hasEmailSupport && user.email) {
      sendTaskDeleteEmail(
        user.email,
        existingTask.title,
        existingTask.project.name,
        req.user.name
      ).catch(err => console.error('Failed to send task delete email:', err));
    }
  }

  // Notify project managers about the deletion
  const fullProject = await req.db.project.findUnique({
    where: { id: existingTask.projectId },
    include: { managers: { select: { id: true, name: true, email: true } } }
  });
  if (fullProject?.managers) {
    for (const manager of fullProject.managers) {
      if (manager.id !== req.user.id && !existingTask.assignees.some(a => a.user.id === manager.id)) {
        await createNotification(req, {
          userId: manager.id,
          title: 'Task Deleted',
          message: `The task "${existingTask.title}" has been deleted from project ${existingTask.project.name}.`,
          type: 'TASK_DELETED',
        });
        if (hasEmailSupport && manager.email) {
          sendTaskDeleteEmail(
            manager.email,
            existingTask.title,
            existingTask.project.name,
            req.user.name
          ).catch(err => console.error('Failed to send task delete email to manager:', err));
        }
      }
    }
  }

  res.json({ message: 'Task deleted successfully' });
};

export const getMyTasks = async (req, res) => {
  try {
    // Check if user is admin/manager - they see all tasks
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';

    const { projectId } = req.query;

    const where = {
      project: {
        organizationId: req.user.organizationId,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

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
        projectId: task.projectId || existingTask?.projectId || null,
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
  const { status, sendEmail = true, rejectionReason } = req.body;

  try {
    // Verify task belongs to user's organization
    const existingTask = await req.db.task.findFirst({
      where: { id, project: { organizationId: req.user.organizationId } },
      include: { 
        project: {
          include: { managers: true }
        }, 
        assignees: true 
      }
    });
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    let updatedTags = existingTask.tags || [];
    let updatedRejectionReason = existingTask.rejectionReason;

    // Check if the current user is an assignee who was assigned by someone else
    const userAssignee = existingTask.assignees?.find(a => a.userId === req.user.id);
    const wasAssignedBySomeoneElse = userAssignee && userAssignee.assignedById && userAssignee.assignedById !== req.user.id;

    // Members are ALWAYS subject to strict rules. Custom roles who were assigned by someone else are also subject to strict rules.
    const isStrictReviewer = req.user.role === 'MEMBER' || (wasAssignedBySomeoneElse && !['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(req.user.role));

    if (isStrictReviewer) {
      if (status === 'COMPLETED') {
        return res.status(403).json({ error: 'You cannot move this task directly to Completed. Please move it to In Review so the assigner can review it.' });
      }

      const existingPendingTag = updatedTags.find(t => t.startsWith('PENDING_APPROVAL:'));
      
      // Only require approval when moving to IN_REVIEW
      if (status === 'IN_REVIEW') {
        if (!existingPendingTag) {
          // First move to review — record the original status to roll back to if rejected
          updatedTags = [...updatedTags, `PENDING_APPROVAL:${existingTask.status}`];
        }
      } else {
        // If they move it back to TODO or IN_PROGRESS or BLOCKED, remove the pending tag
        if (existingPendingTag) {
          updatedTags = updatedTags.filter(t => !t.startsWith('PENDING_APPROVAL:'));
        }
      }
    } else {
      // For managers/admins/assigners changing status, clear the pending tag
      updatedTags = updatedTags.filter(t => !t.startsWith('PENDING_APPROVAL:'));
      
      if (status === 'COMPLETED') {
        // Clear rejection reason on approval
        updatedRejectionReason = null;
        
        // Add APPROVED_BY tag if it was pending or in review
        if (existingTask.status === 'IN_REVIEW' || existingTask.tags?.some(t => t.startsWith('PENDING_APPROVAL:'))) {
           updatedTags = updatedTags.filter(t => !t.startsWith('APPROVED_BY:')); // clear old
           updatedTags.push(`APPROVED_BY:${req.user.name}`);
        }
      } else if (status === 'IN_PROGRESS' || status === 'TODO') {
        // If rejecting, save the reason if provided
        if (rejectionReason) {
          updatedRejectionReason = rejectionReason;
        }
      }
    }

    let completionPercentage = undefined;
    if (status === 'COMPLETED') completionPercentage = 100;
    else if (status === 'IN_REVIEW') completionPercentage = 75;
    else if (status === 'IN_PROGRESS') completionPercentage = 50;
    else if (status === 'TODO' || status === 'BLOCKED') completionPercentage = 0;

    const task = await req.db.task.update({
      where: { id },
      data: {
        status,
        tags: updatedTags,
        rejectionReason: updatedRejectionReason,
        ...(completionPercentage !== undefined && { completionPercentage })
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        project: { select: { name: true, managers: { select: { id: true, email: true } } } },
      },
    });

    if (task.phaseId) {
      await recalculatePhaseProgress(req.db, task.phaseId);
    }

    // Determine the assigner (if any) for the current user
    const userAssigneeRecord = task.assignees.find(a => a.user.id === req.user.id);
    let assignedByName = null;
    let assignerToNotify = null;
    if (userAssigneeRecord?.assignedById) {
      assignerToNotify = await req.db.user.findUnique({ where: { id: userAssigneeRecord.assignedById } });
      if (assignerToNotify) assignedByName = assignerToNotify.name;
    }

    // Log activity
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: task.projectId || task.project?.id || existingTask?.projectId || null,
        action: 'UPDATED',
        entity: 'task',
        entityId: task.id,
        details: {
          title: task.title,
          projectName: task.project?.name || null,
          action: 'Status Updated',
          status,
          oldStatus: existingTask.status,
          ...(assignedByName ? { assignedBy: assignedByName } : {})
        },
      };

      // 1. Log to tenant DB
      await req.db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[UpdateTaskStatus] Failed to log activity:', logErr.message);
    }

    // ==========================================
    // 1. Notify Assignees and Assigners
    // ==========================================
    const updatedBy = req.user.name;
    const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;

    // Fetch assigners
    const assignerIds = [...new Set(task.assignees.map(a => a.assignedById).filter(id => id && id !== req.user.id))];
    const assigners = assignerIds.length > 0 ? await req.db.user.findMany({ where: { id: { in: assignerIds } } }) : [];

    // Determine base message and title
    let notificationType = 'TASK_STATUS_UPDATED';
    let notificationTitle = `Task Status Updated by ${updatedBy}`;
    let notificationMessage = `Task "${task.title}" status has been updated to ${task.status} by ${updatedBy}${assignedByName ? ` (Assigned by: ${assignedByName})` : ''}`;

    if (existingTask.status === 'IN_REVIEW') {
      if (status === 'COMPLETED' || status === 'DONE') {
        notificationType = 'TASK_APPROVED';
        notificationTitle = `Task Approved by ${updatedBy} 🎉`;
        notificationMessage = `Task "${task.title}" has been approved by ${updatedBy}. Great job!`;
      } else if (status === 'TODO' || status === 'IN_PROGRESS') {
        notificationType = 'TASK_REJECTED';
        notificationTitle = `Task Needs Changes (by ${updatedBy}) ⚠️`;
        notificationMessage = `Task "${task.title}" was moved back to ${status} by ${updatedBy}.`;
        if (rejectionReason) {
          notificationMessage += ` Reason: "${rejectionReason}"`;
        }
      }
    }

    // Determine who to notify
    const notifyUsers = new Map();

    // Assignees should always be notified of status changes unless they made the change themselves
    for (const { user } of task.assignees) {
      if (user.id !== req.user.id) {
        notifyUsers.set(user.id, user);
      }
    }

    // If approved, notify assigners as well
    if (status === 'COMPLETED') {
      for (const assigner of assigners) {
        if (assigner.id !== req.user.id) {
           notifyUsers.set(assigner.id, assigner);
        }
      }

      // Also notify co-managers
      if (existingTask.project?.managers) {
        for (const manager of existingTask.project.managers) {
          if (manager.id !== req.user.id) {
            notifyUsers.set(manager.id, manager);
          }
        }
      }
    }

    // Send notifications
    for (const user of notifyUsers.values()) {
      if (hasEmailSupport && sendEmail && user.email && (await shouldSendEmail(req.db, user.id, 'TASK_STATUS_UPDATED'))) {
        sendTaskStatusUpdateEmail(
          user.email,
          task.title,
          task.project.name,
          task.status,
          updatedBy,
          assignedByName,
          origin
        ).catch(err => console.error('Failed to send task status update email:', err));
      }

      await createNotification(req, {
        userId: user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        link: `/task-board?project=${existingTask.projectId}`
      });
    }

    // Notify Manager for Approval if requested by Member AND it requires approval
    if (req.user.role === 'MEMBER' && status === 'IN_REVIEW') {
      const approverTag = updatedTags.find(t => t.startsWith('APPROVER:'));
      let approverIds = approverTag ? [approverTag.split(':')[1]] : (existingTask.project?.managers && existingTask.project.managers.length > 0 ? existingTask.project.managers.map(m => m.id) : []);
      const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;

      const member = await req.db.user.findUnique({ where: { id: req.user.id }, include: { manager: true } });

      if (approverIds.length > 0) {
        for (const mId of approverIds) {
          await createNotification(req, {
            userId: mId,
            title: 'Status Approval Required',
            message: `${req.user.name} moved task "${task.title}" to ${status}. Approval required.`,
            type: 'TASK_APPROVAL_REQUEST',
            link: `/task-board?project=${existingTask.projectId}&highlight=${task.id}&action=pending`
          });
          
          // Send email to manager
          if (hasEmailSupport && sendEmail) {
            const manager = await req.db.user.findUnique({ where: { id: mId } });
            if (manager?.email && (await shouldSendEmail(req.db, manager.id, 'TASK_APPROVAL_REQUEST'))) {
              sendTaskStatusUpdateEmail(manager.email, task.title, task.project.name, status, req.user.name, origin)
                .catch(err => console.error('Failed to send approval email to manager:', err));
            }
          }
        }
      } else {
        const admins = await req.db.user.findMany({ where: { organizationId: req.user.organizationId, role: 'ADMIN' } });
        for (const admin of admins) {
          await createNotification(req, {
            userId: admin.id,
            title: 'Status Approval Required',
            message: `${req.user.name} moved task "${task.title}" to ${status}. Approval required.`,
            type: 'TASK_APPROVAL_REQUEST',
            link: `/task-board?project=${existingTask.projectId}&highlight=${task.id}&action=pending`
          });
          
          // Send email to admin
          if (hasEmailSupport && sendEmail && admin.email && (await shouldSendEmail(req.db, admin.id, 'TASK_APPROVAL_REQUEST'))) {
            sendTaskStatusUpdateEmail(admin.email, task.title, task.project.name, status, req.user.name, origin)
              .catch(err => console.error('Failed to send approval email to admin:', err));
          }
        }
      }

      // Also notify direct manager if they are different from the primary approver
      if (member?.manager && !approverIds.includes(member.manager.id)) {
        await createNotification(req, {
          userId: member.manager.id,
          title: 'Task Status Updated',
          message: `Task "${task.title}" status has been updated to ${task.status} by ${req.user.name}`,
          type: 'TASK_STATUS_UPDATED',
          link: `/task-board?project=${existingTask.projectId}&highlight=${task.id}`
        });

        if (hasEmailSupport && sendEmail && member.manager.email && (await shouldSendEmail(req.db, member.manager.id, 'TASK_STATUS_UPDATED'))) {
          sendTaskStatusUpdateEmail(member.manager.email, task.title, task.project.name, status, req.user.name, origin)
            .catch(err => console.error('Failed to send task status update email to direct manager:', err));
        }
      }
    } else if (req.user.role === 'MEMBER' && status !== existingTask.status) {
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
      const updatedBy = req.user.name;
      const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

      const [member, fullProject] = await Promise.all([
        req.db.user.findUnique({ where: { id: req.user.id }, include: { manager: true } }),
        req.db.project.findUnique({ where: { id: task.projectId }, include: { managers: true } })
      ]);

      const managersToNotify = [];
      if (member?.manager) managersToNotify.push(member.manager);
      if (fullProject?.managers && fullProject.managers.length > 0) {
        for (const m of fullProject.managers) {
          if (m.id !== member?.manager?.id) {
            managersToNotify.push(m);
          }
        }
      }

      if (assignerToNotify && !managersToNotify.some(m => m.id === assignerToNotify.id) && assignerToNotify.id !== req.user.id) {
        managersToNotify.push(assignerToNotify);
      }

      for (const manager of managersToNotify) {
        // In-app notification
        await createNotification(req, {
          userId: manager.id,
          title: 'Task Status Updated',
          message: `Task "${task.title}" status has been updated to ${task.status} by ${updatedBy}${assignedByName ? ` (Assigned by: ${assignedByName})` : ''}`,
          type: 'TASK_STATUS_UPDATED',
          link: `/task-board?project=${existingTask.projectId}&highlight=${task.id}`
        });

        // Email notification
        if (hasEmailSupport && sendEmail && manager.email && (await shouldSendEmail(req.db, manager.id, 'TASK_STATUS_UPDATED'))) {
          sendTaskStatusUpdateEmail(
            manager.email,
            task.title,
            task.project.name,
            task.status,
            updatedBy,
            assignedByName,
            origin
          ).catch(err => console.error('Failed to send task status update email to manager/assigner:', err));
        }
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const approveTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { sendEmail = true } = req.body;
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can approve status changes.' });
    }

    const task = await req.db.task.findFirst({
      where: { id, project: { organizationId: req.user.organizationId } },
      include: { assignees: { include: { user: true } }, project: true }
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newTags = task.tags.filter(t => !t.startsWith('PENDING_APPROVAL:') && !t.startsWith('APPROVED_BY:'));
    
    if (newTags.length === task.tags.length && !task.tags.some(t => t.startsWith('PENDING_APPROVAL:'))) {
      return res.status(400).json({ error: 'Task is not pending approval' });
    }
    
    newTags.push(`APPROVED_BY:${req.user.name}`);

    const updatedTask = await req.db.task.update({
      where: { id },
      data: { 
        tags: newTags,
        status: 'COMPLETED',
        completionPercentage: 100,
        rejectionReason: null
      },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true } } } },
        project: { select: { name: true } }
      }
    });

    // Log activity
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: task.projectId || task.project?.id || null,
        action: 'UPDATED',
        entity: 'task',
        entityId: task.id,
        details: {
          title: task.title,
          projectName: task.project?.name || null,
          action: 'Status Updated',
          status: 'COMPLETED',
          oldStatus: task.status
        },
      };
      await req.db.activityLog.create({ data: logData });
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('Failed to log approval activity:', logErr);
    }

    const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;

    for (const { user } of updatedTask.assignees) {
      await createNotification(req, {
        userId: user.id,
        title: `Task Approved by ${req.user.name} 🎉`,
        message: `Your task "${task.title}" was approved by ${req.user.name} and moved to Completed.`,
        type: 'TASK_APPROVED',
        link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=approved`
      });

      if (hasEmailSupport && sendEmail && user.email && (await shouldSendEmail(req.db, user.id, 'TASK_APPROVED'))) {
        sendTaskStatusUpdateEmail(
          user.email,
          task.title,
          updatedTask.project.name,
          'COMPLETED (Approved)',
          req.user.name,
          null, // assignedByName
          origin // baseUrl
        ).catch(err => console.error('Failed to send task approval email:', err));
      }
    }

    // Notify co-managers about the approval
    const fullProject = await req.db.project.findUnique({
      where: { id: task.projectId },
      include: { managers: { select: { id: true, name: true, email: true } } }
    });
    if (fullProject?.managers) {
      for (const manager of fullProject.managers) {
        if (manager.id !== req.user.id) {
          await createNotification(req, {
            userId: manager.id,
            title: `Task Approved by ${req.user.name} 🎉`,
            message: `Task "${task.title}" was approved by ${req.user.name} and moved to Completed.`,
            type: 'TASK_APPROVED',
            link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=approved`
          });
          if (hasEmailSupport && sendEmail && manager.email && (await shouldSendEmail(req.db, manager.id, 'TASK_APPROVED'))) {
            sendTaskStatusUpdateEmail(
              manager.email,
              task.title,
              updatedTask.project.name,
              'COMPLETED (Approved)',
              req.user.name,
              null,
              origin
            ).catch(err => console.error('Failed to send approval email to co-manager:', err));
          }
        }
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error approving task status:', error);
    res.status(500).json({ error: 'Failed to approve task status' });
  }
};

export const rejectTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, sendEmail = true } = req.body;

  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can reject status changes.' });
    }

    const task = await req.db.task.findFirst({
      where: { id, project: { organizationId: req.user.organizationId } },
      include: { assignees: { include: { user: true } }, project: true }
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const pendingTag = task.tags.find(t => t.startsWith('PENDING_APPROVAL:'));
    if (!pendingTag) {
      return res.status(400).json({ error: 'Task is not pending approval' });
    }

    const newTags = task.tags.filter(t => t !== pendingTag);

    const updatedTask = await req.db.task.update({
      where: { id },
      data: { 
        status: 'IN_PROGRESS', 
        tags: newTags,
        completionPercentage: 50,
        rejectionReason: rejectionReason || null
      },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true } } } },
        project: { select: { name: true } }
      }
    });

    // Log activity
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: task.projectId || task.project?.id || null,
        action: 'UPDATED',
        entity: 'task',
        entityId: task.id,
        details: {
          title: task.title,
          projectName: task.project?.name || null,
          action: 'Status Updated',
          status: 'IN_PROGRESS',
          oldStatus: task.status,
          rejectionReason
        },
      };
      await req.db.activityLog.create({ data: logData });
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('Failed to log rejection activity:', logErr);
    }

    const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;

    for (const { user } of updatedTask.assignees) {
      let message = `Your task "${task.title}" was rejected by ${req.user.name} and moved back to In Progress.`;
      if (rejectionReason) {
        message += ` Reason: "${rejectionReason}"`;
      }
      
      await createNotification(req, {
        userId: user.id,
        title: 'Task Rejected ⚠️',
        message,
        type: 'TASK_REJECTED',
        link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=rejected`
      });

      if (hasEmailSupport && sendEmail && user.email && (await shouldSendEmail(req.db, user.id, 'TASK_REJECTED'))) {
        sendTaskStatusUpdateEmail(
          user.email,
          task.title,
          updatedTask.project.name,
          'IN_PROGRESS (Rejected)',
          req.user.name,
          origin
        ).catch(err => console.error('Failed to send task rejection email:', err));
      }
    }

    // Notify co-managers about the rejection
    const fullProject = await req.db.project.findUnique({
      where: { id: task.projectId },
      include: { managers: { select: { id: true, name: true, email: true } } }
    });
    if (fullProject?.managers) {
      for (const manager of fullProject.managers) {
        if (manager.id !== req.user.id) {
          let coManagerMsg = `Task "${task.title}" was rejected by ${req.user.name} and moved back to In Progress.`;
          if (rejectionReason) coManagerMsg += ` Reason: "${rejectionReason}"`;
          await createNotification(req, {
            userId: manager.id,
            title: 'Task Rejected ⚠️',
            message: coManagerMsg,
            type: 'TASK_REJECTED',
            link: `/task-board?project=${task.projectId}&highlight=${task.id}&action=rejected`
          });
          if (hasEmailSupport && sendEmail && manager.email && (await shouldSendEmail(req.db, manager.id, 'TASK_REJECTED'))) {
            sendTaskStatusUpdateEmail(
              manager.email,
              task.title,
              updatedTask.project.name,
              'IN_PROGRESS (Rejected)',
              req.user.name,
              null,
              origin
            ).catch(err => console.error('Failed to send rejection email to co-manager:', err));
          }
        }
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error rejecting task status:', error);
    res.status(500).json({ error: 'Failed to reject task status' });
  }
};

// ── Activity Log & Comments ────────────────────────────────────────────────

export const getTaskActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await req.db.activityLog.findMany({
      where: { entity: 'task', entityId: id, organizationId: req.user.organizationId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching task activity:', error);
    res.status(500).json({ error: 'Failed to fetch task activity' });
  }
};

export const getTaskComments = async (req, res) => {
  const { id } = req.params;
  try {
    const comments = await req.db.taskComment.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ error: 'Failed to fetch task comments' });
  }
};

export const addTaskComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  try {
    const comment = await req.db.taskComment.create({
      data: {
        taskId: id,
        userId: req.user.id,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Notify task assignees
    const task = await req.db.task.findUnique({
      where: { id },
      include: { 
        assignees: { include: { user: true } }, 
        project: true 
      }
    });
    
    // Check if email features are globally enabled for this instance
    const hasEmailSupport = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
    const origin = req.headers.origin || process.env.FRONTEND_URL;

    if (task) {
      for (const assignee of task.assignees) {
        if (assignee.userId !== req.user.id) {
          await createNotification(req, {
            userId: assignee.userId,
            title: 'New Comment',
            message: `${req.user.name} commented on task: ${task.title}`,
            type: 'TASK_COMMENT',
            link: `/task-board?project=${task.projectId}&highlight=${task.id}`
          });
          
          if (hasEmailSupport && assignee.user?.email && (await shouldSendEmail(req.db, assignee.user.id, 'TASK_COMMENT'))) {
            sendTaskCommentEmail(
              assignee.user.email,
              task.title,
              req.user.name,
              content.trim(),
              task.projectId,
              task.id,
              origin
            ).catch(err => console.error('Failed to send task comment email:', err));
          }
        }
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding task comment:', error);
    res.status(500).json({ error: 'Failed to add task comment' });
  }
};

export const deleteTaskComment = async (req, res) => {
  const { commentId } = req.params;
  try {
    const comment = await req.db.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }
    await req.db.taskComment.delete({ where: { id: commentId } });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting task comment:', error);
    res.status(500).json({ error: 'Failed to delete task comment' });
  }
};
