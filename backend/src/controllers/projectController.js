import prisma from '../lib/prisma.js';
import { sendProjectManagerEmail, sendProjectClientEmail, sendProjectMemberAssignmentEmail } from '../services/emailService.js';

/** Fetch team members (MEMBER/MANAGER roles) assigned to a project via Workload */
const getProjectTeamMembers = async (db, projectId) => {
  const workloads = await db.workload.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { user: { name: 'asc' } },
  });
  return workloads.map(w => w.user);
};

/** Create and emit an internal notification */
const createNotification = async (req, { userId, title, message, type }) => {
  try {
    const notification = await req.db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        organizationId: req.user.organizationId,
      },
    });

    if (req.io) {
      // Emit to organization room - frontend will filter by userId
      req.io.to(`org-${req.user.organizationId}`).emit('new-notification', notification);
    }
    return notification;
  } catch (error) {
    console.error('Failed to create internal notification:', error);
  }
};

/** Fetch general team members associated with a manager (from other projects) */
const getManagerGeneralTeam = async (db, managerId, organizationId) => {
  if (!managerId) return [];

  // Find IDs of ALL projects managed by this manager
  const projects = await db.project.findMany({
    where: { managerId, organizationId },
    select: { id: true }
  });
  const projectIds = projects.map(p => p.id);

  if (projectIds.length === 0) return [];

  // Find users who worked on these projects
  const users = await db.user.findMany({
    where: {
      organizationId,
      role: 'MEMBER',
      OR: [
        { workloads: { some: { projectId: { in: projectIds } } } },
        { taskAssignments: { some: { task: { projectId: { in: projectIds } } } } }
      ]
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
    distinct: ['id']
  });

  return users;
};


export const getAllProjects = async (req, res) => {
  const fs = await import('fs');
  const logFile = 'project_error_debug.log';
  const log = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} [getAllProjects] ${msg}\n`);
    console.log(`[getAllProjects] ${msg}`);
  };

  try {
    log(`Start - User: ${req.user?.id}, Org: ${req.user?.organizationId}`);
    
    // ── Check for tenant DB connection errors ─────────────────────────────
    if (req.tenantDbError) {
      log(`Tenant DB Error detected: ${req.tenantDbError}`);
      return res.status(503).json({
        error: 'Organization database connection failed',
        message: 'We are having trouble connecting to your organization database. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? req.tenantDbError : undefined
      });
    }

    // ── Verify model existence (prevents crash on main DB fallback) ───────
    if (!req.db) {
      log('req.db is UNDEFINED');
      return res.status(500).json({ error: 'Database client not initialized' });
    }

    if (!req.db.project) {
      log('req.db.project is UNDEFINED. Current db keys: ' + Object.keys(req.db).filter(k => !k.startsWith('$')).join(', '));
      if (req.user.role === 'SUPERADMIN') {
         return res.json([]); 
      }
      return res.status(500).json({ 
        error: 'Database configuration error',
        message: 'The requested model "Project" is not available in the current database context.'
      });
    }

    log('Database and Model verified. Testing connection...');
    try {
      await req.db.$connect();
      log('Connection Successful');
    } catch (connErr) {
      log(`Connection Failed: ${connErr.message}`);
      return res.status(500).json({ error: 'Database connection failed', details: connErr.message });
    }

    const { search, status: statusFilter, category, page, limit: rawLimit } = req.query;

    const where = {
      organizationId: req.user.organizationId,
    };

    // For SuperAdmin, we might want to show all if no organizationId is in token, 
    // but usually they use the SuperAdmin dashboard.
    if (req.user.role === 'SUPERADMIN' && !req.user.organizationId) {
       delete where.organizationId;
    }

  // If Manager, only show projects they manage
  if (req.user.role === 'MANAGER') {
    where.managerId = req.user.id;
  }

  // If Client, only show projects they are assigned to
  if (req.user.role === 'CLIENT') {
    where.clientId = req.user.id;
  }

  // If Member, only show projects they are assigned to (via tasks or workload)
  if (req.user.role === 'MEMBER') {
    where.OR = [
      {
        tasks: {
          some: {
            assignees: { some: { userId: req.user.id } }
          }
        }
      },
      {
        workloads: {
          some: {
            userId: req.user.id
          }
        }
      },
      {
        phases: {
          some: {
            tasks: {
              some: {
                assignees: { some: { userId: req.user.id } }
              }
            }
          }
        }
      }
    ];
  }

  // Backend search filter
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  // Backend status filter
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  // Backend category filter
  if (category && category !== 'ALL') {
    where.category = category;
  }

  const projectSelect = {
    id: true,
    organizationId: true,
    name: true,
    description: true,
    category: true,
    managerId: true,
    clientId: true,
    status: true,
    startDate: true,
    endDate: true,
    totalBudget: true,
    usedBudget: true,
    createdAt: true,
    updatedAt: true,
    // Relations
    manager: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    client: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    _count: { select: { tasks: true, phases: true } },
    tasks: { select: { status: true, storyPoints: true } }
  };

  const addProgress = (projects) => {
    return projects.map(project => {
      const tasks = project.tasks || [];
      const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedStoryPoints = tasks
        .filter((t) => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      let progress = 0;
      if (totalStoryPoints > 0) {
        progress = Math.round((completedStoryPoints / totalStoryPoints) * 100);
      } else if (project._count?.tasks > 0) {
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
        progress = Math.round((completedTasks / project._count.tasks) * 100);
      }

      const { tasks: _, ...projectWithoutTasks } = project;
      return { ...projectWithoutTasks, progress };
    });
  };

  // If page is provided, return paginated response
  if (page) {
    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.max(1, parseInt(rawLimit) || 10);
    const skip = (pageNum - 1) * limit;

    log(`Fetching paginated projects (page: ${pageNum}, limit: ${limit})...`);
    const [projects, total] = await Promise.all([
      req.db.project.findMany({
        where,
        select: projectSelect,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      req.db.project.count({ where }),
    ]);

    log(`Found ${projects.length} projects (Total: ${total}). Computing progress...`);
    const result = {
      data: addProgress(projects),
      pagination: {
        total,
        page: pageNum,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
    log('Success. Returning paginated response.');
    return res.json(result);
  }

  // No pagination - return all (backward compat for dropdowns)
  log('Fetching all projects (no pagination)...');
  const projects = await req.db.project.findMany({
    where,
    select: projectSelect,
    orderBy: {
      name: 'asc',
    },
  });

  log(`Found ${projects.length} projects. Computing progress...`);
  const result = addProgress(projects);
  log('Success. Returning response.');
  res.json(result);

  } catch (error) {
    const fs = await import('fs');
    const logFile = 'project_error_debug.log';
    const timestamp = new Date().toISOString();
    const errorMsg = `${timestamp} [CRASH] ${error.message}\nStack: ${error.stack}\n`;
    fs.appendFileSync(logFile, errorMsg);
    console.error('CRITICAL ERROR in getAllProjects:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getProject = async (req, res) => {
  const { id } = req.params;

  const project = await req.db.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      managerId: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      usedBudget: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      phases: {
        orderBy: {
          order: 'asc',
        },
      },
      tasks: {
        include: {
          assignees: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true },
              },
            },
          },
        },
      },
      workloads: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Calculate progress
  const totalStoryPoints = project.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedStoryPoints = project.tasks
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  let progress = 0;
  if (totalStoryPoints > 0) {
    progress = Math.round((completedStoryPoints / totalStoryPoints) * 100);
  } else if (project.tasks.length > 0) {
    const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
    progress = Math.round((completedTasks / project.tasks.length) * 100);
  }

  res.json({ ...project, progress });
};

export const createProject = async (req, res) => {
  const {
    name,
    description,
    clientId,
    startDate,
    endDate,
    totalBudget,
    managerId,
    status,
    category,
    sendEmail = true,
  } = req.body;

  if (!name || name.trim().length < 3 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Project name must be between 3 and 100 characters' });
  }

  const organizationId = req.user.organizationId;

  // ── Resource Limit Check ──────────────────────────────────────────────────
  const [org, currentProjectCount] = await Promise.all([
    req.db.organization.findUnique({ where: { id: organizationId } }),
    req.db.project.count({ where: { organizationId } })
  ]);

  if (org && currentProjectCount >= org.maxProjects) {
    return res.status(403).json({
      error: `Project limit reached. Your plan allows a maximum of ${org.maxProjects} projects. Please upgrade your plan.`
    });
  }

  // Validation: Ensure clientId and managerId belong to the same organization
  if (clientId) {
    const client = await req.db.user.findFirst({ where: { id: clientId, organizationId, role: 'CLIENT' } });
    if (!client) return res.status(400).json({ error: 'Invalid client for this organization' });
  }
  if (managerId) {
    const manager = await req.db.user.findFirst({ where: { id: managerId, organizationId, role: 'MANAGER' } });
    if (!manager) return res.status(400).json({ error: 'Invalid manager for this organization' });
  }

  // Check if name starts with a number
  if (/^\d/.test(name.trim())) {
    return res.status(400).json({ error: 'Project name cannot start with a number' });
  }

  if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
    return res.status(400).json({ error: 'Project name cannot contain special characters. Only alphanumeric characters and spaces are allowed.' });
  }

  // Check for duplicate project name in the same organization
  const existingProject = await req.db.project.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      organizationId: req.user.organizationId
    }
  });

  if (existingProject) {
    return res.status(400).json({ error: 'A project with this name already exists in your organization' });
  }

  if (!category) {
    return res.status(400).json({ error: 'Project category (type) is required' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Project status is required' });
  }

  if (!startDate) {
    return res.status(400).json({
      error: "Start Date is required"
    });
  }

  // Optional: validate only if endDate exists
  if (endDate && new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({
      error: "End Date must be after Start Date"
    });
  }

  // Removed redundant endDate validation that was causing errors when endDate was optional.


  if (totalBudget !== undefined && totalBudget !== null && Number(totalBudget) < 0) {
    return res.status(400).json({ error: 'Budget cannot be negative' });
  }

  if (description && description.length > 1000) {
    return res.status(400).json({ error: 'Description cannot exceed 1000 characters' });
  }

  const project = await req.db.project.create({
    data: {
      organizationId: req.user.organizationId,
      name,
      description,
      clientId: clientId || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalBudget,
      managerId: managerId || null,
      status: status || 'PLANNING',
      category: category || 'INTERNAL',
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      managerId: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      usedBudget: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true, // Needed for email notification
          avatar: true,
        },
      },
    },
  });

  // Create default phases
  const defaultPhases = [
    { name: 'Planning', order: 1 },
    { name: 'Design', order: 2 },
    { name: 'Development', order: 3 },
    { name: 'Testing', order: 4 },
    { name: 'Deployment', order: 5 },
  ];

  await req.db.phase.createMany({
    data: defaultPhases.map((phase) => ({
      projectId: project.id,
      ...phase,
      status: 'WAITING',
      completionPercentage: 0,
    })),
  });

  // Log activity
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: project.id,
      action: 'PROJECT_CREATED',
      entity: 'project',
      entityId: project.id,
      details: { name: project.name },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[CreateProject] Failed to log activity:', logErr.message);
  }

  // Send rich email notification to manager
  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  if (hasEmailSupport && sendEmail && project.manager?.email) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    sendProjectManagerEmail(
      project.manager.email,
      project,
      project.manager,
      project.client || null,
      req.user.name,
      origin
    ).catch(err => console.error('Failed to send manager project email:', err));

    createNotification(req, {
      userId: project.manager.id,
      title: 'New Project Assigned',
      message: `You have been assigned as manager for project: ${project.name}`,
      type: 'PROJECT_ASSIGNED',
    });
  }

  // Send rich email notification to client
  if (hasEmailSupport && sendEmail && project.client?.email) {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    sendProjectClientEmail(
      project.client.email,
      project,
      project.manager || null,
      req.user.name,
      origin
    ).catch(err => console.error('Failed to send client project email:', err));
  }

  // Activity Logging
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: project.id,
      action: 'CREATED',
      entity: 'project',
      entityId: project.id,
      details: { name: project.name },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[CreateProject] Failed to log activity:', logErr.message);
  }

  res.status(201).json(project);
};

// ── bulkCreateProjects ───────────────────────────────────────────────────
export const bulkCreateProjects = async (req, res) => {
  const { projects: projectList } = req.body;
  const organizationId = req.user.organizationId;

  if (!Array.isArray(projectList) || projectList.length === 0) {
    return res.status(400).json({ error: 'A non-empty array of projects is required.' });
  }

  if (projectList.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 projects can be imported at once.' });
  }

  // Check organization limits
  const [org, currentProjectCount] = await Promise.all([
    req.db.organization.findUnique({ where: { id: organizationId } }),
    req.db.project.count({ where: { organizationId } })
  ]);

  if (!org) return res.status(404).json({ error: 'Organization not found.' });

  const remainingSlots = org.maxProjects - currentProjectCount;
  if (remainingSlots <= 0) {
    return res.status(403).json({ error: `Project limit reached. Your plan allows ${org.maxProjects} projects.` });
  }

  if (projectList.length > remainingSlots) {
    return res.status(403).json({
      error: `Cannot import ${projectList.length} projects. Only ${remainingSlots} slots remaining (current: ${currentProjectCount}/${org.maxProjects}).`
    });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  for (let i = 0; i < projectList.length; i++) {
    const row = projectList[i];
    const rowNum = i + 1;
    const { name, description, clientEmail, managerEmail, startDate, endDate, totalBudget, status, category, sendEmail = true } = row;

    // ── Basic Validation ──
    if (!name || !startDate) {
      results.push({ row: rowNum, name: name || '(empty)', status: 'FAILED', error: 'Project name and start date are required.' });
      failCount++;
      continue;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
      results.push({ row: rowNum, name, status: 'FAILED', error: 'Name cannot contain special characters.' });
      failCount++;
      continue;
    }

    // Check duplicate name in org
    const existing = await req.db.project.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' }, organizationId }
    });
    if (existing) {
      results.push({ row: rowNum, name, status: 'FAILED', error: 'A project with this name already exists in your organization.' });
      failCount++;
      continue;
    }

    try {
      let clientId = null;
      let managerId = null;

      // Lookup Client
      if (clientEmail) {
        const client = await req.db.user.findFirst({ where: { email: clientEmail.toLowerCase().trim(), organizationId, role: 'CLIENT' } });
        if (!client) {
          results.push({ row: rowNum, name, status: 'FAILED', error: `Client with email "${clientEmail}" not found or not a client.` });
          failCount++;
          continue;
        }
        clientId = client.id;
      }

      // Lookup Manager
      if (managerEmail) {
        const manager = await req.db.user.findFirst({ where: { email: managerEmail.toLowerCase().trim(), organizationId, role: 'MANAGER' } });
        if (!manager) {
          results.push({ row: rowNum, name, status: 'FAILED', error: `Manager with email "${managerEmail}" not found or not a manager.` });
          failCount++;
          continue;
        }
        managerId = manager.id;
      }

      // ── Normalize Data ──
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        results.push({ row: rowNum, name, status: 'FAILED', error: `Invalid start date: "${startDate}". Use YYYY-MM-DD.` });
        failCount++;
        continue;
      }

      let parsedEndDate = null;
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) parsedEndDate = d;
      }

      // Sanitize Budget (Handle strings with currency symbols/commas)
      let parsedBudget = 0;
      if (totalBudget !== undefined && totalBudget !== null && totalBudget !== '') {
        const cleanBudget = String(totalBudget).replace(/[^0-9.-]/g, '');
        parsedBudget = parseFloat(cleanBudget) || 0;
      }

      // Validate Enums
      const validStatuses = ['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
      let normalizedStatus = (status || 'PLANNING').toUpperCase().trim();
      if (!validStatuses.includes(normalizedStatus)) {
        normalizedStatus = 'PLANNING';
      }

      // Create Project
      const project = await req.db.project.create({
        data: {
          organizationId,
          name: name.trim(),
          description: description || null,
          clientId,
          managerId,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          totalBudget: parsedBudget,
          status: normalizedStatus,
          category: (category || 'INTERNAL').toUpperCase().trim(),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          manager: { select: { id: true, name: true, email: true } },
        }
      });


      // Create default phases
      const defaultPhases = [
        { name: 'Planning', order: 1 },
        { name: 'Design', order: 2 },
        { name: 'Development', order: 3 },
        { name: 'Testing', order: 4 },
        { name: 'Deployment', order: 5 },
      ];

      await req.db.phase.createMany({
        data: defaultPhases.map((phase) => ({
          projectId: project.id,
          ...phase,
          status: 'WAITING',
          completionPercentage: 0,
        })),
      });

      // Activity Logging
      try {
        const logData = {
          userId: req.user.id,
          organizationId,
          projectId: project.id,
          action: 'PROJECT_CREATED',
          entity: 'project',
          entityId: project.id,
          details: { name: project.name, bulkImport: true },
        };
        await req.db.activityLog.create({ data: logData });
        await prisma.activityLog.create({ data: logData });
      } catch (logErr) { }

      // Notifications
        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        if (project.manager?.email) {
          sendProjectManagerEmail(project.manager.email, project, project.manager, project.client || null, req.user.name, origin).catch(() => { });
          createNotification(req, {
            userId: project.manager.id,
            title: 'New Project Assigned (Bulk)',
            message: `You have been assigned as manager for project: ${project.name}`,
            type: 'PROJECT_ASSIGNED',
          });
        }
        if (project.client?.email) {
          sendProjectClientEmail(project.client.email, project, project.manager || null, req.user.name, origin).catch(() => { });
        }

        results.push({ row: rowNum, name: project.name, status: 'SUCCESS' });
        successCount++;
      } catch (err) {
      results.push({ row: rowNum, name, status: 'FAILED', error: err.message });
      failCount++;
    }
  }

  res.status(200).json({
    message: `Import complete. ${successCount} succeeded, ${failCount} failed.`,
    summary: { total: projectList.length, success: successCount, failed: failCount },
    results,
  });
};

export const updateProject = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    clientId,
    startDate,
    endDate,
    totalBudget,
    usedBudget,
    managerId,
    status,
    category,
    sendEmail = true,
  } = req.body;

  // Verify project belongs to user's organization
  const existingProject = await req.db.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
  });

  if (!existingProject) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const organizationId = req.user.organizationId;

  // Validation: Ensure new clientId and managerId belong to the same organization
  if (clientId && clientId !== existingProject.clientId) {
    const client = await req.db.user.findFirst({ where: { id: clientId, organizationId, role: 'CLIENT' } });
    if (!client) return res.status(400).json({ error: 'Invalid client for this organization' });
  }
  if (managerId && managerId !== existingProject.managerId) {
    const manager = await req.db.user.findFirst({ where: { id: managerId, organizationId, role: 'MANAGER' } });
    if (!manager) return res.status(400).json({ error: 'Invalid manager for this organization' });
  }

  const isManagerChanged = managerId && managerId !== existingProject.managerId;
  const isClientChanged = clientId && clientId !== existingProject.clientId;

  // Validation
  if (name !== undefined && (name.trim().length < 3 || name.trim().length > 100)) {
    return res.status(400).json({ error: 'Project name must be between 3 and 100 characters' });
  }

  if (name !== undefined && !/^[a-zA-Z0-9\s]+$/.test(name)) {
    return res.status(400).json({ error: 'Project name cannot contain special characters. Only alphanumeric characters and spaces are allowed.' });
  }

  // Check for duplicate name — exclude the current project itself
  if (name !== undefined) {
    const duplicateProject = await req.db.project.findFirst({
      where: {
        id: { not: id },
        name: { equals: name.trim(), mode: 'insensitive' },
        organizationId: req.user.organizationId,
      },
    });

    if (duplicateProject) {
      return res.status(400).json({ error: 'A project with this name already exists in your organization' });
    }
  }

  const newStartDate = startDate ? new Date(startDate) : existingProject.startDate;
  const newEndDate = endDate ? new Date(endDate) : existingProject.endDate;

  if (newStartDate && newEndDate && newEndDate <= newStartDate) {
    return res.status(400).json({ error: 'End Date must be strictly after Start Date' });
  }

  if (totalBudget !== undefined && totalBudget !== null && Number(totalBudget) < 0) {
    return res.status(400).json({ error: 'Total Budget cannot be negative' });
  }

  if (usedBudget !== undefined && usedBudget !== null && Number(usedBudget) < 0) {
    return res.status(400).json({ error: 'Used Budget cannot be negative' });
  }

  if (description && description.length > 1000) {
    return res.status(400).json({ error: 'Description cannot exceed 1000 characters' });
  }

  const project = await req.db.project.update({
    where: { id },
    data: {
      name,
      description,
      clientId: clientId !== undefined ? (clientId || null) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      totalBudget: totalBudget && totalBudget !== '' ? totalBudget : undefined,
      usedBudget: usedBudget && usedBudget !== '' ? usedBudget : undefined,
      managerId: managerId !== undefined ? (managerId || null) : undefined,
      status,
      category,
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      managerId: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      usedBudget: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  // Log activity
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: project.id,
      action: 'UPDATED',
      entity: 'project',
      entityId: project.id,
      details: { name: project.name },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[UpdateProject] Failed to log activity:', logErr.message);
  }

  // Send rich emails if manager or client changed
  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  if (hasEmailSupport && sendEmail && (isManagerChanged || isClientChanged)) {

    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    if (project.manager?.email) {
      sendProjectManagerEmail(
        project.manager.email,
        project,
        project.manager,
        project.client || null,
        req.user.name,
        origin
      ).catch(err => console.error('Failed to send manager project email:', err));

      createNotification(req, {
        userId: project.manager.id,
        title: 'Project Assignment Updated',
        message: `You have been assigned as manager for project: ${project.name}`,
        type: 'PROJECT_ASSIGNED',
      });
    }

    if (project.client?.email) {
      sendProjectClientEmail(
        project.client.email,
        project,
        project.manager || null,
        req.user.name,
        origin
      ).catch(err => console.error('Failed to send client project email:', err));
    }
  }

  res.json(project);
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  // Verify project belongs to user's organization
  const existingProject = await req.db.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
  });

  if (!existingProject) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Log deletion BEFORE deleting from database
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: 'DELETED',
      entity: 'project',
      entityId: id,
      details: { name: existingProject.name },
    };

    // 1. Log to tenant DB
    await req.db.activityLog.create({ data: logData });

    // 2. Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[DeleteProject] Failed to log activity:', logErr.message);
  }

  await req.db.project.delete({
    where: { id },
  });

  res.json({ message: 'Project deleted successfully' });
};
export const addProjectMember = async (req, res) => {
  const { id: projectId } = req.params;
  const { userId } = req.body;

  try {
    // Verify project belongs to user's organization and requester is manager/admin
    const project = await req.db.project.findFirst({
      where: {
        id: projectId,
        organizationId: req.user.organizationId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user.role !== 'ADMIN' && project.managerId !== req.user.id) {
      return res.status(403).json({ error: 'Only project managers or admins can add members' });
    }

    // Verify member belongs to the same organization
    const member = await req.db.user.findFirst({
      where: { id: userId, organizationId: req.user.organizationId }
    });
    if (!member) return res.status(400).json({ error: 'Member not found in this organization' });

    // Check if user is already a member
    const existingWorkload = await req.db.workload.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (existingWorkload) {
      return res.status(200).json({ message: 'already added', alreadyAdded: true });
    }

    // Create workload (default 0% workloadPercentage just to link them)
    const workload = await req.db.workload.create({
      data: {
        userId,
        projectId,
        workloadPercentage: 0,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Log activity
    await req.db.activityLog.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId,
        action: 'MEMBER_ADDED',
        entity: 'project',
        entityId: projectId,
        details: { memberId: userId, memberName: workload.user.name },
      },
    });

    createNotification(req, {
      userId: userId,
      title: 'Added to Project',
      message: `You have been added to project: ${project.name}`,
      type: 'PROJECT_ASSIGNED',
    });

    // Send email notification
    const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
    if (hasEmailSupport && workload.user.email) {
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
      sendProjectMemberAssignmentEmail(
        workload.user.email,
        workload.user.name,
        project.name,
        project.description,
        req.user.name,
        origin
      ).catch(err => console.error('Failed to send project member email:', err));
    }

    res.status(201).json(workload.user);
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Failed to add project member' });
  }
};

export const removeProjectMember = async (req, res) => {
  const { id: projectId, userId } = req.params;

  try {
    // Verify project belongs to user's organization and requester is manager/admin
    const project = await req.db.project.findFirst({
      where: {
        id: projectId,
        organizationId: req.user.organizationId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user.role !== 'ADMIN' && project.managerId !== req.user.id) {
      return res.status(403).json({ error: 'Only project managers or admins can remove members' });
    }

    // Prevent removing the project manager
    if (userId === project.managerId) {
      return res.status(400).json({ error: 'Cannot remove the project manager' });
    }

    // Delete the workload
    await req.db.workload.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    // Log activity
    await req.db.activityLog.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId,
        action: 'MEMBER_REMOVED',
        entity: 'project',
        entityId: projectId,
        details: { memberId: userId },
      },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Failed to remove project member' });
  }
};