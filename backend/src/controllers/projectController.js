import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllProjects = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: {
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
      _count: {
        select: {
          tasks: true,
          phases: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json(projects);
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
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
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

  res.json(project);
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
