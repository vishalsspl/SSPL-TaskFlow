import { PrismaClient } from '@prisma/client';
import { sendProjectManagerEmail, sendProjectClientEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

/** Fetch team members (MEMBER/MANAGER roles) assigned to a project via Workload */
const getProjectTeamMembers = async (projectId) => {
  const workloads = await prisma.workload.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  return workloads.map(w => w.user);
};

/** Fetch general team members associated with a manager (from other projects) */
const getManagerGeneralTeam = async (managerId, organizationId) => {
  if (!managerId) return [];

  // Find IDs of ALL projects managed by this manager
  const projects = await prisma.project.findMany({
    where: { managerId, organizationId },
    select: { id: true }
  });
  const projectIds = projects.map(p => p.id);

  if (projectIds.length === 0) return [];

  // Find users who worked on these projects
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      role: 'MEMBER',
      OR: [
        { workloads: { some: { projectId: { in: projectIds } } } },
        { taskAssignments: { some: { task: { projectId: { in: projectIds } } } } }
      ]
    },
    select: { id: true, name: true, email: true, role: true },
    distinct: ['id']
  });

  return users;
};


export const getAllProjects = async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : undefined;
  const take = limit || undefined;

  const where = {
    organizationId: req.user.organizationId,
  };

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

  // Get total count for pagination
  const total = await prisma.project.count({ where });

  const projects = await prisma.project.findMany({
    where,
    skip,
    take,
    include: {
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
      _count: {
        select: {
          tasks: true,
          phases: true,
        },
      },
      tasks: {
        select: {
          status: true,
          storyPoints: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const projectsWithProgress = projects.map(project => {
    const totalStoryPoints = project.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = project.tasks
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    let progress = 0;
    if (totalStoryPoints > 0) {
      progress = Math.round((completedStoryPoints / totalStoryPoints) * 100);
    } else if (project._count.tasks > 0) {
      const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
      progress = Math.round((completedTasks / project._count.tasks) * 100);
    }

    // Remove tasks from response to keep it light
    const { tasks, ...projectWithoutTasks } = project;
    return { ...projectWithoutTasks, progress };
  });

  if (page || limit) {
    res.json({
      data: projectsWithProgress,
      meta: {
        total,
        page: page || 1,
        limit: limit || total,
        totalPages: limit ? Math.ceil(total / limit) : 1
      }
    });
  } else {
    res.json(projectsWithProgress);
  }
};

export const getProject = async (req, res) => {
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
    include: {
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
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const project = await prisma.project.create({
    data: {
      organizationId: req.user.organizationId,
      name,
      description,
      clientId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalBudget,
      managerId,
      status: status || 'PLANNING',
      category: category || 'INTERNAL',
    },
    include: {
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

  await prisma.phase.createMany({
    data: defaultPhases.map((phase) => ({
      projectId: project.id,
      ...phase,
      status: 'WAITING',
      completionPercentage: 0,
    })),
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: req.user.id,
      projectId: project.id,
      action: 'created',
      entity: 'project',
      entityId: project.id,
      details: { name: project.name },
    },
  });

  // Send rich email notification to manager
  if (project.manager?.email) {
    let teamMembers = await getProjectTeamMembers(project.id);

    // Fallback: If no project team yet (new project), show Manager's general team
    if (teamMembers.length === 0 && project.managerId) {
      teamMembers = await getManagerGeneralTeam(project.managerId, req.user.organizationId);
    }

    sendProjectManagerEmail(
      project.manager.email,
      project,
      project.manager,
      project.client || null,
      teamMembers,
      req.user.name
    ).catch(err => console.error('Failed to send manager project email:', err));
  }

  // Send rich email notification to client
  if (project.client?.email) {
    const teamMembers = await getProjectTeamMembers(project.id);
    sendProjectClientEmail(
      project.client.email,
      project,
      project.manager || null,
      teamMembers,
      req.user.name
    ).catch(err => console.error('Failed to send client project email:', err));
  }

  res.status(201).json(project);
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
  } = req.body;

  // Verify project belongs to user's organization
  const existingProject = await prisma.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
  });

  if (!existingProject) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const isManagerChanged = managerId && managerId !== existingProject.managerId;
  const isClientChanged = clientId && clientId !== existingProject.clientId;

  const project = await prisma.project.update({
    where: { id },
    data: {
      name,
      description,
      clientId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      totalBudget: totalBudget && totalBudget !== '' ? totalBudget : undefined,
      usedBudget: usedBudget && usedBudget !== '' ? usedBudget : undefined,
      managerId,
      status,
      category,
    },
    include: {
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
  await prisma.activityLog.create({
    data: {
      userId: req.user.id,
      projectId: project.id,
      action: 'updated',
      entity: 'project',
      entityId: project.id,
    },
  });

  // Send rich emails if manager or client changed
  if (isManagerChanged || isClientChanged) {
    let teamMembers = await getProjectTeamMembers(project.id);

    // Fallback: If no project team yet, show Manager's general team
    if (teamMembers.length === 0 && project.managerId) {
      teamMembers = await getManagerGeneralTeam(project.managerId, req.user.organizationId);
    }

    if (project.manager?.email) {
      sendProjectManagerEmail(
        project.manager.email,
        project,
        project.manager,
        project.client || null,
        teamMembers,
        req.user.name
      ).catch(err => console.error('Failed to send manager project email:', err));
    }

    if (project.client?.email) {
      sendProjectClientEmail(
        project.client.email,
        project,
        project.manager || null,
        teamMembers,
        req.user.name
      ).catch(err => console.error('Failed to send client project email:', err));
    }
  }

  res.json(project);
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  // Verify project belongs to user's organization
  const existingProject = await prisma.project.findFirst({
    where: {
      id,
      organizationId: req.user.organizationId,
    },
  });

  if (!existingProject) {
    return res.status(404).json({ error: 'Project not found' });
  }

  await prisma.project.delete({
    where: { id },
  });

  res.json({ message: 'Project deleted successfully' });
};
export const addProjectMember = async (req, res) => {
  const { id: projectId } = req.params;
  const { userId } = req.body;

  try {
    // Verify project belongs to user's organization and requester is manager/admin
    const project = await prisma.project.findFirst({
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

    // Check if user is already a member
    const existingWorkload = await prisma.workload.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (existingWorkload) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    // Create workload (default 0% workloadPercentage just to link them)
    const workload = await prisma.workload.create({
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
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        projectId,
        action: 'added member',
        entity: 'project',
        entityId: projectId,
        details: { memberId: userId, memberName: workload.user.name },
      },
    });

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
    const project = await prisma.project.findFirst({
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
    await prisma.workload.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        projectId,
        action: 'removed member',
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
