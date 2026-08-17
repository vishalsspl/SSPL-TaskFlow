import prisma from '../lib/prisma.js';

export const getDashboard = async (req, res) => {
  const { projectId } = req.params;

  // Verify project belongs to user's organization
  const project = await req.db.project.findFirst({
    where: {
      id: projectId,
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
      createdAt: true,
      updatedAt: true,
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
    },
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get all tasks for the project
  const tasks = await req.db.task.findMany({
    where: { projectId },
    include: {
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
    },
  });

  // Calculate metrics
  const now = new Date();
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedStoryPoints = tasks
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const progressPercentage = totalStoryPoints > 0
    ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
    : (totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0);

  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED'
  );
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;

  // Calculate days to launch
  let daysToLaunch = null;
  if (project.endDate) {
    const diffTime = new Date(project.endDate) - now;
    daysToLaunch = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Get active members (users with tasks in this project)
  const activeMembers = await req.db.user.findMany({
    where: {
      taskAssignments: {
        some: {
          task: { projectId },
        },
      },
    },
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: 'asc' },
    distinct: ['id'],
  });

  // Calculate budget metrics
  const totalBudget = project.totalBudget ? Number(project.totalBudget) : 0;
  const usedBudget = project.usedBudget ? Number(project.usedBudget) : 0;

  const budgetUsedPercentage = totalBudget
    ? (usedBudget / totalBudget) * 100
    : 0;

  const budgetRemaining = totalBudget
    ? totalBudget - usedBudget
    : 0;

  // Get workload distribution
  const workloads = await req.db.workload.findMany({
    where: { projectId },
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
  });

  // Get upcoming deadlines
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && new Date(t.dueDate) >= now && t.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 10)
    .map((task) => ({
      ...task,
      daysUntilDue: Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24)),
    }));

  // Get overdue tasks with days overdue
  const overdueTasksWithDays = overdueTasks
    .map((task) => ({
      ...task,
      daysOverdue: Math.ceil((now - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Get recent activity
  const recentActivity = await req.db.activityLog.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const dashboard = {
    project,
    overview: {
      totalTasks,
      completedTasks: completedTasksCount,
      totalStoryPoints,
      completedStoryPoints,
      progressPercentage,
      overdueTasksCount: overdueTasks.length,
      inProgressTasks,
      activeMembers: activeMembers.length,
      daysToLaunch,
    },
    budget: {
      total: totalBudget,
      used: usedBudget,
      remaining: budgetRemaining,
      usedPercentage: budgetUsedPercentage,
    },
    overdueTasks: overdueTasksWithDays,
    workloads,
    upcomingDeadlines,
    recentActivity,
    phases: project.phases,
    tasks,
  };

  res.json(dashboard);
};
