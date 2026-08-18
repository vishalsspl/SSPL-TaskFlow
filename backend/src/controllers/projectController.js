import prisma from '../lib/prisma.js';
import { sendProjectManagerEmail, sendProjectClientEmail, sendProjectMemberAssignmentEmail, sendProjectUpdateEmail, sendProjectDeleteEmail } from '../services/emailService.js';

/** Fetch team members (MEMBER/MANAGER roles) assigned to a project via Workload */
const getProjectTeamMembers = async (db, projectId) => {
  const workloads = await db.workload.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { user: { name: 'asc' } },
  });
  return workloads.map(w => w.user);
};

import { createNotification, shouldSendEmail } from '../utils/notifications.js';
import { ensureProjectSchema, ensureOrganizationSchema } from '../lib/schemaValidator.js';


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

    // ── Lazy Migration ────────────────────────────────────────────────────────
    try {
      await ensureProjectSchema(req.db);
    } catch (migrateErr) {
      log(`Lazy migration warning: ${migrateErr.message}`);
    }

    const { search, status: statusFilter, category, page, limit: rawLimit, sortBy, sortOrder = 'asc', managerIds, projectIds, startDateFrom, startDateTo, tasksMin, tasksMax } = req.query;

    const where = {
      organizationId: req.user.organizationId,
    };

    // For SuperAdmin, we might want to show all if no organizationId is in token, 
    // but usually they use the SuperAdmin dashboard.
    if (req.user.role === 'SUPERADMIN' && !req.user.organizationId) {
       delete where.organizationId;
    }

  // If Manager, show projects they manage + the General project
  if (req.user.role === 'MANAGER') {
    where.OR = [
      { managers: { some: { id: req.user.id } } },
      { name: { in: ['General', 'General Tasks'] } }
    ];
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
      },
      { name: { in: ['General', 'General Tasks'] } }
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

  // Advanced Filters
  if (managerIds) {
    const ids = managerIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      where.managers = { some: { id: { in: ids } } };
    }
  }

  if (projectIds) {
    const ids = projectIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      where.id = { in: ids };
    }
  }

  if (startDateFrom || startDateTo) {
    where.startDate = {};
    if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
    if (startDateTo) where.startDate.lte = new Date(startDateTo);
  }

  if (tasksMin !== undefined || tasksMax !== undefined) {
    const min = tasksMin !== undefined ? parseInt(tasksMin) : undefined;
    const max = tasksMax !== undefined ? parseInt(tasksMax) : undefined;
    
    if (!isNaN(min) || !isNaN(max)) {
      const countFilter = {};
      if (!isNaN(min)) countFilter.gte = min;
      if (!isNaN(max)) countFilter.lte = max;
      
      where.AND = [
        ...(where.AND || []),
        { tasks: { _count: countFilter } }
      ];
    }
  }

  let taskWhereFilter = {};
  if (req.user.role === 'MANAGER') {
    taskWhereFilter = {
      OR: [
        { project: { managers: { some: { id: req.user.id } } } },
        { assignees: { some: { userId: req.user.id } } },
        { assignees: { some: { user: { managerId: req.user.id } } } },
      ]
    };
  } else if (req.user.role === 'MEMBER') {
    taskWhereFilter = {
      assignees: { some: { userId: req.user.id } }
    };
  }

  const projectSelect = {
    id: true,
    organizationId: true,
    name: true,
    description: true,
    category: true,
    clientId: true,
    status: true,
    startDate: true,
    endDate: true,
    totalBudget: true,
    usedBudget: true,
    allowMemberTaskCreation: true,
    createdAt: true,
    updatedAt: true,
    // Relations
    managers: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    client: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    _count: { select: { tasks: { where: taskWhereFilter }, phases: true } },
    tasks: { where: taskWhereFilter, select: { status: true, storyPoints: true } }
  };

  const addProgress = (projects) => {
    const withProgress = projects.map(project => {
      const tasks = project.tasks || [];
      const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedStoryPoints = tasks
        .filter((t) => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      let progress = 0;
      const memberTaskCount = tasks.length;
      
      if (totalStoryPoints > 0) {
        progress = Math.round((completedStoryPoints / totalStoryPoints) * 100);
      } else if (memberTaskCount > 0) {
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
        progress = Math.round((completedTasks / memberTaskCount) * 100);
      }

      const taskStats = {
        TODO: tasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
        BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
      };

      const { tasks: _, ...projectWithoutTasks } = project;
      
      // Override _count.tasks with the filtered tasks length so UI shows only their tasks
      if (projectWithoutTasks._count) {
        projectWithoutTasks._count.tasks = memberTaskCount;
      }

      return { ...projectWithoutTasks, progress, taskStats };
    });

    // Always sort General or General Tasks to the very top
    return withProgress.sort((a, b) => {
      const aIsGeneral = a.name === 'General' || a.name === 'General Tasks';
      const bIsGeneral = b.name === 'General' || b.name === 'General Tasks';
      if (aIsGeneral && !bIsGeneral) return -1;
      if (!aIsGeneral && bIsGeneral) return 1;
      return 0;
    });
  };

  let prismaOrderBy = { name: 'asc' };
  if (sortBy) {
    const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';
    switch(sortBy) {
      case 'name': prismaOrderBy = { name: order }; break;
      case 'client': prismaOrderBy = { client: { name: order } }; break;
      case 'manager': prismaOrderBy = { manager: { name: order } }; break;
      case 'timeline': prismaOrderBy = { startDate: order }; break;
      case 'budget': prismaOrderBy = { totalBudget: order }; break;
      case 'status': prismaOrderBy = { status: order }; break;
      case 'tasks': prismaOrderBy = { tasks: { _count: order } }; break;
    }
  }

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
        orderBy: prismaOrderBy,
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
    orderBy: prismaOrderBy,
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

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);

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

      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      usedBudget: true,
      allowMemberTaskCreation: true,
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
      managers: {
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

  // Authorization Checks
  if (req.user.role === 'MANAGER') {
    if (!project.managers?.some(m => m.id === req.user.id) && !['General', 'General Tasks'].includes(project.name)) {
      return res.status(403).json({ error: 'Unauthorized: You are no longer a manager of this project.' });
    }
  } else if (req.user.role === 'CLIENT') {
    if (project.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: You do not have access to this project.' });
    }
  } else if (req.user.role === 'MEMBER') {
    const isAssigned = project.workloads?.some(w => w.user.id === req.user.id) || 
                       project.tasks?.some(t => t.assignees.some(a => a.user.id === req.user.id));
    if (!isAssigned && !['General', 'General Tasks'].includes(project.name)) {
      return res.status(403).json({ error: 'Unauthorized: You are not assigned to this project.' });
    }
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

  // Calculate workload balance for team members
  let totalEffort = 0;
  const userEfforts = {};

  project.tasks.filter(t => t.status !== 'COMPLETED').forEach(t => {
    const effort = t.storyPoints || 1;
    t.assignees.forEach(a => {
      const uid = a.user.id;
      userEfforts[uid] = (userEfforts[uid] || 0) + effort;
      totalEffort += effort;
    });
  });

  if (project.workloads) {
    project.workloads = project.workloads.map(w => {
      const uid = w.user.id;
      const uEffort = userEfforts[uid] || 0;
      const percentage = totalEffort > 0 ? Math.round((uEffort / totalEffort) * 100) : 0;
      return { ...w, workloadPercentage: Math.min(100, percentage) };
    });
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
    managerIds = [],
    status,
    category,
    sendEmail = true,
    allowMemberTaskCreation = false,
  } = req.body;

  if (!name || name.trim().length < 3 || name.trim().length > 30) {
    return res.status(400).json({ error: 'Project name must be between 3 and 30 characters' });
  }

  const organizationId = req.user.organizationId;

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);
  await ensureOrganizationSchema(req.db);

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

  // Validation: Ensure clientId and managerIds belong to the same organization
  if (clientId) {
    const client = await req.db.user.findFirst({ where: { id: clientId, organizationId, role: 'CLIENT' } });
    if (!client) return res.status(400).json({ error: 'Invalid client for this organization' });
  }
  
  if (!Array.isArray(managerIds)) {
    return res.status(400).json({ error: 'managerIds must be an array' });
  }

  if (org && managerIds.length > org.maxManagersPerProject) {
    return res.status(400).json({ error: `You can only assign up to ${org.maxManagersPerProject} managers to a project.` });
  }

  if (managerIds.length > 0) {
    const managers = await req.db.user.findMany({ 
      where: { id: { in: managerIds }, organizationId, role: 'MANAGER' } 
    });
    if (managers.length !== managerIds.length) {
      return res.status(400).json({ error: 'One or more managers are invalid for this organization' });
    }
  }

  // Check if name starts with a number
  if (/^\d/.test(name.trim())) {
    return res.status(400).json({ error: 'Project name cannot start with a number' });
  }

  const isAlphanumeric = (char) => /^[a-zA-Z0-9]$/.test(char);
  if (!isAlphanumeric(name.trim()[0]) || !isAlphanumeric(name.trim()[name.trim().length - 1])) {
    return res.status(400).json({ error: 'Project name cannot start or end with a special character' });
  }

  // Check for duplicate project name in the same organization
  const existingProject = await req.db.project.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      organizationId: req.user.organizationId
    },
    select: { id: true } // Avoid fetching all columns which might crash if schema is old
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
      managers: managerIds.length > 0 ? { connect: managerIds.map(id => ({ id })) } : undefined,
      status: status || 'PLANNING',
      category: category || 'INTERNAL',
      allowMemberTaskCreation: Boolean(allowMemberTaskCreation),
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      usedBudget: true,
      allowMemberTaskCreation: true,
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
      managers: {
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

  // Auto-create a default task so managers can log time immediately
  const createdPhases = await req.db.phase.findMany({
    where: { projectId: project.id },
    orderBy: { order: 'asc' }
  });

  if (createdPhases.length > 0) {
    const prefix = project.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    await req.db.task.create({
      data: {
        projectId: project.id,
        phaseId: createdPhases[0].id,
        title: 'Project Setup & Planning',
        description: 'Initial project setup and planning activities.',
        status: 'TODO',
        priority: 'MEDIUM',
        type: 'TASK',
        taskNumber: 1,
        shortId: `${prefix}-1`,
        assignees: project.managers?.length > 0 ? {
          create: project.managers.map(m => ({
            user: { connect: { id: m.id } },
            assignedBy: { connect: { id: req.user.id } }
          }))
        } : undefined
      }
    });
  }

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

  // Always send internal notification to managers
  if (project.managers && project.managers.length > 0) {
    for (const manager of project.managers) {
      createNotification(req, {
        userId: manager.id,
        title: 'New Project Assigned',
        message: `You have been assigned as a manager for project: ${project.name}`,
        type: 'PROJECT_ASSIGNED',
      });
      
      if (hasEmailSupport && sendEmail && manager.email) {
        if (await shouldSendEmail(req.db, manager.id, 'PROJECT_ASSIGNED')) {
          const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
          await sendProjectManagerEmail(
            manager.email,
            project,
            manager,
            project.client || null,
            req.user.name,
            origin
          );
        }
      }
    }
  }

  // Send rich email notification to client
  if (hasEmailSupport && sendEmail && project.client?.email) {
    if (await shouldSendEmail(req.db, project.client.id, 'PROJECT_ASSIGNED')) {
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
      sendProjectClientEmail(
        project.client.email,
        project,
        project.managers && project.managers.length > 0 ? project.managers[0] : null,
        req.user.name,
        origin
      ).catch(err => console.error('Failed to send client project email:', err));
    }
  }

  // Removed duplicate activity log

  res.status(201).json(project);
};

// ── bulkCreateProjects ───────────────────────────────────────────────────
export const bulkCreateProjects = async (req, res) => {
  const { projects: projectList } = req.body;
  const organizationId = req.user.organizationId;

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);

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
      where: { name: { equals: name.trim(), mode: 'insensitive' }, organizationId },
      select: { id: true }
    });
    if (existing) {
      results.push({ row: rowNum, name, status: 'FAILED', error: 'A project with this name already exists in your organization.' });
      failCount++;
      continue;
    }

    try {
      let clientId = null;
      let managerIds = [];

      // Lookup Manager
      if (managerEmail) {
        const emails = managerEmail.split(',').map(e => e.toLowerCase().trim()).filter(Boolean);
        const managers = await req.db.user.findMany({ where: { email: { in: emails }, organizationId, role: 'MANAGER' } });
        if (managers.length !== emails.length) {
          results.push({ row: rowNum, name, status: 'FAILED', error: `One or more managers not found.` });
          failCount++;
          continue;
        }
        managerIds = managers.map(m => m.id);
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
          managers: managerIds.length > 0 ? { connect: managerIds.map(id => ({ id })) } : undefined,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          totalBudget: parsedBudget,
          status: normalizedStatus,
          category: (category || 'INTERNAL').toUpperCase().trim(),
        },
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true, email: true } },
          managers: { select: { id: true, name: true, email: true } },
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

      // Auto-create a default task so managers can log time immediately
      const createdPhases = await req.db.phase.findMany({
        where: { projectId: project.id },
        orderBy: { order: 'asc' }
      });

      if (createdPhases.length > 0) {
        const prefix = project.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
        await req.db.task.create({
          data: {
            projectId: project.id,
            phaseId: createdPhases[0].id,
            title: 'Project Setup & Planning',
            description: 'Initial project setup and planning activities.',
            status: 'TODO',
            priority: 'MEDIUM',
            type: 'TASK',
            taskNumber: 1,
            shortId: `${prefix}-1`,
            assignees: project.managers?.length > 0 ? {
              create: project.managers.map(m => ({
                user: { connect: { id: m.id } },
                assignedBy: { connect: { id: req.user.id } }
              }))
            } : undefined
          }
        });
      }

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
        if (project.managers && project.managers.length > 0) {
          for (const manager of project.managers) {
            if (manager.email) {
              if (await shouldSendEmail(req.db, manager.id, 'PROJECT_ASSIGNED')) {
                sendProjectManagerEmail(manager.email, project, manager, project.client || null, req.user.name, origin).catch(() => { });
              }
            }
            createNotification(req, {
              userId: manager.id,
              title: 'New Project Assigned (Bulk)',
              message: `You have been assigned as manager for project: ${project.name}`,
              type: 'PROJECT_ASSIGNED',
            });
          }
        }
        if (project.client?.email) {
          if (await shouldSendEmail(req.db, project.client.id, 'PROJECT_ASSIGNED')) {
            sendProjectClientEmail(project.client.email, project, project.managers && project.managers.length > 0 ? project.managers[0] : null, req.user.name, origin).catch(() => { });
          }
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
    managerIds,
    status,
    category,
    sendEmail = true,
    allowMemberTaskCreation,
  } = req.body;

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);

  // Verify project belongs to user's organization
  const existingProject = await req.db.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
    select: { id: true, name: true, managers: { select: { id: true } }, clientId: true, startDate: true, endDate: true }
  });

  if (!existingProject) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Prevent renaming the General project
  if (existingProject.name === 'General' || existingProject.name === 'General Tasks') {
    if (name !== undefined && name.trim() !== existingProject.name) {
      return res.status(400).json({ error: 'The name of the General project cannot be changed.' });
    }
  }

  const organizationId = req.user.organizationId;

  // Validation: Ensure new clientId and managerId belong to the same organization
  if (clientId && clientId !== existingProject.clientId) {
    const client = await req.db.user.findFirst({ where: { id: clientId, organizationId, role: 'CLIENT' } });
    if (!client) return res.status(400).json({ error: 'Invalid client for this organization' });
  }
  if (managerIds) {
    if (!Array.isArray(managerIds)) return res.status(400).json({ error: 'managerIds must be an array' });
    
    const org = await req.db.organization.findUnique({ where: { id: organizationId } });
    if (org && managerIds.length > org.maxManagersPerProject) {
      return res.status(400).json({ error: `You can only assign up to ${org.maxManagersPerProject} managers to a project.` });
    }

    if (managerIds.length > 0) {
      const managers = await req.db.user.findMany({ where: { id: { in: managerIds }, organizationId, role: 'MANAGER' } });
      if (managers.length !== managerIds.length) return res.status(400).json({ error: 'One or more managers are invalid for this organization' });
    }
  }

  const existingManagerIds = existingProject.managers ? existingProject.managers.map(m => m.id).sort() : [];
  const isManagerChanged = managerIds && JSON.stringify([...managerIds].sort()) !== JSON.stringify(existingManagerIds);
  const isClientChanged = clientId && clientId !== existingProject.clientId;

  // Validation
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 30) {
      return res.status(400).json({ error: 'Project name must be between 3 and 30 characters' });
    }
    
    if (/^\d/.test(trimmedName)) {
      return res.status(400).json({ error: 'Project name cannot start with a number' });
    }
    
    const isAlphanumeric = (char) => /^[a-zA-Z0-9]$/.test(char);
    if (!isAlphanumeric(trimmedName[0]) || !isAlphanumeric(trimmedName[trimmedName.length - 1])) {
      return res.status(400).json({ error: 'Project name cannot start or end with a special character' });
    }
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

  const newStartDate = startDate === null ? null : (startDate ? new Date(startDate) : existingProject.startDate);
  const newEndDate = endDate === null ? null : (endDate ? new Date(endDate) : existingProject.endDate);

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
      startDate: startDate === null ? null : (startDate ? new Date(startDate) : undefined),
      endDate: endDate === null ? null : (endDate ? new Date(endDate) : undefined),
      totalBudget: totalBudget && totalBudget !== '' ? totalBudget : undefined,
      usedBudget: usedBudget && usedBudget !== '' ? usedBudget : undefined,
      managers: managerIds ? { set: managerIds.map(id => ({ id })) } : undefined,
      status,
      category,
      ...(allowMemberTaskCreation !== undefined && { allowMemberTaskCreation: Boolean(allowMemberTaskCreation) }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      usedBudget: true,
      allowMemberTaskCreation: true,
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
      managers: {
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

  if (isManagerChanged && project.managers && project.managers.length > 0) {
    const newManagers = project.managers.filter(m => !existingManagerIds.includes(m.id));
    const keptManagers = project.managers.filter(m => existingManagerIds.includes(m.id));

    // 1. Notify NEW managers they are assigned
    for (const manager of newManagers) {
      createNotification(req, {
        userId: manager.id,
        title: 'Project Assignment Updated',
        message: `You have been assigned as manager for project: ${project.name}`,
        type: 'PROJECT_ASSIGNED',
      });
    }

    // 2. Notify EXISTING managers that a new manager was added
    if (newManagers.length > 0) {
      const newManagerNames = newManagers.map(m => m.name).join(', ');
      for (const manager of keptManagers) {
        createNotification(req, {
          userId: manager.id,
          title: 'Project Manager Added',
          message: `${newManagerNames} has been added as a manager for project: ${project.name}`,
          type: 'PROJECT_UPDATED',
        });
      }

      // 3. Notify PROJECT MEMBERS that a new manager was added
      try {
        const members = await getProjectTeamMembers(req.db, project.id);
        const membersToNotify = members.filter(m => !existingManagerIds.includes(m.id) && !newManagers.some(nm => nm.id === m.id));
        
        for (const member of membersToNotify) {
          createNotification(req, {
            userId: member.id,
            title: 'Project Manager Added',
            message: `${newManagerNames} has been added as a manager for project: ${project.name}`,
            type: 'PROJECT_UPDATED',
          });
        }
      } catch (err) {
        console.error('Failed to notify project members about new manager:', err);
      }
    }
  }

  if (hasEmailSupport && sendEmail && (isManagerChanged || isClientChanged || (project.managers && project.managers.length > 0))) {

    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
    
    if (project.managers && project.managers.length > 0) {
      for (const manager of project.managers) {
        if (manager.email) {
          if (isManagerChanged && (!existingManagerIds.includes(manager.id))) {
            if (await shouldSendEmail(req.db, manager.id, 'PROJECT_ASSIGNED')) {
              await sendProjectManagerEmail(
                manager.email,
                project,
                manager,
                project.client || null,
                req.user.name,
                origin
              );
            }
          } else {
            // Send generic update email to current manager
            if (await shouldSendEmail(req.db, manager.id, 'PROJECT_UPDATED')) {
              sendProjectUpdateEmail(
                manager.email,
                project,
                req.user.name,
                origin
              ).catch(err => console.error('Failed to send manager project update email:', err));
            }
          }
        }
      }
    }

    // Email PROJECT MEMBERS if new managers were added
    if (isManagerChanged && project.managers) {
      const newManagers = project.managers.filter(m => !existingManagerIds.includes(m.id));
      if (newManagers.length > 0) {
        try {
          const members = await getProjectTeamMembers(req.db, project.id);
          const membersToNotify = members.filter(m => !existingManagerIds.includes(m.id) && !newManagers.some(nm => nm.id === m.id));
          for (const member of membersToNotify) {
            if (member.email && await shouldSendEmail(req.db, member.id, 'PROJECT_UPDATED')) {
              sendProjectUpdateEmail(
                member.email,
                project,
                req.user.name,
                origin
              ).catch(err => console.error('Failed to send member project update email:', err));
            }
          }
        } catch (err) {
           console.error('Failed to email project members about new manager:', err);
        }
      }
    }

    if (project.client?.email) {
      if (await shouldSendEmail(req.db, project.client.id, 'PROJECT_UPDATED')) {
        sendProjectClientEmail(
          project.client.email,
          project,
          project.managers && project.managers.length > 0 ? project.managers[0] : null,
          req.user.name,
          origin
        ).catch(err => console.error('Failed to send client project email:', err));
      }
    }
  }

  res.json(project);
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);

  // Verify project belongs to user's organization
  const existingProject = await req.db.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
    select: { 
      id: true, 
      name: true,
      managers: { select: { id: true, email: true } }
    }
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

  // Always send internal notification to managers
  if (existingProject.managers && existingProject.managers.length > 0) {
    for (const manager of existingProject.managers) {
      createNotification(req, {
        userId: manager.id,
        title: 'Project Deleted',
        message: `The project ${existingProject.name} has been deleted.`,
        type: 'PROJECT_DELETED',
      });
      
      const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;
      if (hasEmailSupport && manager.email) {
        if (await shouldSendEmail(req.db, manager.id, 'PROJECT_DELETED')) {
          sendProjectDeleteEmail(
            manager.email,
            existingProject.name,
            req.user.name
          ).catch(err => console.error('Failed to send manager project delete email:', err));
        }
      }
    }
  }

  res.json({ message: 'Project deleted successfully' });
};
export const addProjectMember = async (req, res) => {
  const { id: projectId } = req.params;
  const { userId } = req.body;

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);

  try {
    // Verify project belongs to user's organization and requester is manager/admin
    const project = await req.db.project.findFirst({
      where: {
        id: projectId,
        organizationId: req.user.organizationId,
      },
      select: { id: true, name: true, managers: { select: { id: true } } }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user.role !== 'ADMIN' && (!project.managers || !project.managers.some(m => m.id === req.user.id))) {
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
      if (await shouldSendEmail(req.db, workload.user.id, 'PROJECT_ASSIGNED')) {
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
    }

    res.status(201).json(workload.user);
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Failed to add project member' });
  }
};

export const removeProjectMember = async (req, res) => {
  const { id: projectId, userId } = req.params;

  // ── Lazy Migration ────────────────────────────────────────────────────────
  await ensureProjectSchema(req.db);

  try {
    // Verify project belongs to user's organization and requester is manager/admin
    const project = await req.db.project.findFirst({
      where: { id: projectId, organizationId: req.user.organizationId },
      select: { id: true, name: true, managers: { select: { id: true } } }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user.role !== 'ADMIN' && (!project.managers || !project.managers.some(m => m.id === req.user.id))) {
      return res.status(403).json({ error: 'Only project managers or admins can remove members' });
    }

    // Prevent removing the project manager
    if (project.managers && project.managers.some(m => m.id === userId)) {
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

export const updateProjectPhase = async (req, res) => {
  const { id, phaseId } = req.params;
  const { status } = req.body;

  try {
    const phase = await req.db.phase.findFirst({
      where: {
        id: phaseId,
        projectId: id,
      },
      include: {
        project: true
      }
    });

    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    if (req.user.role === 'MANAGER' && (!phase.project.managers || !phase.project.managers.some(m => m.id === req.user.id))) {
      return res.status(403).json({ error: 'Unauthorized: You are not the manager of this project.' });
    }

    const updatedPhase = await req.db.phase.update({
      where: { id: phaseId },
      data: { status }
    });

    // Log activity
    await req.db.activityLog.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId: id,
        action: 'PHASE_UPDATED',
        entity: 'phase',
        entityId: phaseId,
        details: { phaseName: phase.name, oldStatus: phase.status, newStatus: status },
      },
    });

    res.json(updatedPhase);
  } catch (error) {
    console.error('Error updating project phase:', error);
    res.status(500).json({ error: 'Failed to update phase' });
  }
};