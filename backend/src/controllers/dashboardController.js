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
  
  const completedStoryPoints = tasks.reduce((sum, t) => {
    let pct = t.completionPercentage || (t.status === 'COMPLETED' ? 100 : 0);
    return sum + ((t.storyPoints || 0) * (pct / 100));
  }, 0);

  const partialCompletedTasksCount = tasks.reduce((sum, t) => {
    let pct = t.completionPercentage || (t.status === 'COMPLETED' ? 100 : 0);
    return sum + (pct / 100);
  }, 0);

  const progressPercentage = totalStoryPoints > 0
    ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
    : (totalTasks > 0 ? Math.round((partialCompletedTasksCount / totalTasks) * 100) : 0);

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
  const dbWorkloads = await req.db.workload.findMany({
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

  let totalEffort = 0;
  const userEfforts = {};

  tasks.filter(t => t.status !== 'COMPLETED').forEach(t => {
    const effort = t.storyPoints || 1;
    t.assignees.forEach(a => {
      const uid = a.user.id;
      userEfforts[uid] = (userEfforts[uid] || 0) + effort;
      totalEffort += effort;
    });
  });

  const workloads = dbWorkloads.map(w => {
    const uid = w.user.id;
    const uEffort = userEfforts[uid] || 0;
    const percentage = totalEffort > 0 ? Math.round((uEffort / totalEffort) * 100) : 0;
    return { ...w, workloadPercentage: Math.min(100, percentage) };
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

  // Dynamically calculate phase completion percentages based on partial task progress
  const phasesWithProgress = project.phases.map(phase => {
    const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
    if (phaseTasks.length === 0) return phase;

    const phaseTotalStoryPoints = phaseTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    
    let progress = 0;
    if (phaseTotalStoryPoints > 0) {
      const phaseCompletedStoryPoints = phaseTasks.reduce((sum, task) => {
        let pct = task.completionPercentage || (task.status === 'COMPLETED' ? 100 : 0);
        return sum + ((task.storyPoints || 0) * (pct / 100));
      }, 0);
      progress = Math.round((phaseCompletedStoryPoints / phaseTotalStoryPoints) * 100);
    } else {
      const phaseCompletedCount = phaseTasks.reduce((sum, task) => {
        let pct = task.completionPercentage || (task.status === 'COMPLETED' ? 100 : 0);
        return sum + (pct / 100);
      }, 0);
      progress = Math.round((phaseCompletedCount / phaseTasks.length) * 100);
    }

    return { ...phase, completionPercentage: progress };
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
    phases: phasesWithProgress,
    tasks,
  };

  res.json(dashboard);
};
