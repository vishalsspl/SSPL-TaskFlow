import prisma from '../lib/prisma.js';

/**
 * Get overall performance statistics for the organization (Team View)
 */
export const getPerformanceStats = async (req, res) => {
    const { projectId, dateFrom, dateTo } = req.query;
    const orgId = req.user.organizationId;

    try {
        const users = await req.db.user.findMany({
            where: { 
                organizationId: orgId, 
                isApproved: true, 
                role: { in: ['MEMBER', 'MANAGER'] } 
            },
            select: { id: true, name: true, avatar: true, role: true },
        });

        const dateFilter = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);

        const teamStats = await Promise.all(users.map(async (u) => {
            const taskWhere = {
                project: { organizationId: orgId },
                assignees: { some: { userId: u.id } },
            };
            if (projectId) taskWhere.projectId = projectId;

            const timeWhere = { userId: u.id, project: { organizationId: orgId } };
            if (projectId) timeWhere.projectId = projectId;
            if (dateFrom || dateTo) timeWhere.date = dateFilter;

            const [tasks, timeEntries] = await Promise.all([
                req.db.task.findMany({ 
                    where: taskWhere, 
                    select: { status: true, dueDate: true, storyPoints: true, createdAt: true, updatedAt: true } 
                }),
                req.db.timeEntry.findMany({ 
                    where: timeWhere, 
                    select: { hours: true, billable: true } 
                }),
            ]);

            const completed = tasks.filter(t => t.status === 'COMPLETED').length;
            const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
            const totalHours = timeEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
            const completedStoryPoints = tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const velocity = totalHours > 0 ? parseFloat((completedStoryPoints / totalHours).toFixed(2)) : 0;
            const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

            return {
                user: u,
                id: u.id,
                totalTasks: tasks.length,
                completedTasks: completed,
                overdueTasks: overdue,
                totalHours: parseFloat(totalHours.toFixed(2)),
                velocity,
                completionRate,
            };
        }));

        res.json(teamStats);
    } catch (error) {
        console.error('Error fetching performance stats:', error);
        res.status(500).json({ error: 'Failed to fetch performance stats' });
    }
};

/**
 * Get performance metrics for a specific user (My Performance View)
 */
export const getUserPerformance = async (req, res) => {
    const { userId } = req.params;
    const { projectId, dateFrom, dateTo } = req.query;
    const orgId = req.user.organizationId;

    try {
        const dateFilter = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);

        const taskWhere = {
            project: { organizationId: orgId },
            assignees: { some: { userId } },
        };
        if (projectId) taskWhere.projectId = projectId;

        const timeWhere = { userId, project: { organizationId: orgId } };
        if (projectId) timeWhere.projectId = projectId;
        if (dateFrom || dateTo) timeWhere.date = dateFilter;

        const [tasks, timeEntries] = await Promise.all([
            req.db.task.findMany({
                where: taskWhere,
                select: {
                    id: true, title: true, status: true, priority: true,
                    dueDate: true, storyPoints: true, completionPercentage: true,
                    createdAt: true, updatedAt: true,
                    project: { select: { id: true, name: true } },
                },
            }),
            req.db.timeEntry.findMany({
                where: timeWhere,
                select: { hours: true, date: true, billable: true, status: true, project: { select: { id: true, name: true } } },
            })
        ]);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
        const onTimeTasks = tasks.filter(t => t.status === 'COMPLETED' && t.dueDate && new Date(t.updatedAt) <= new Date(t.dueDate)).length;

        const totalHours = timeEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
        const billableHours = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + parseFloat(e.hours), 0);
        const approvedHours = timeEntries.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + parseFloat(e.hours), 0);

        const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedStoryPoints = tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const velocity = totalHours > 0 ? parseFloat((completedStoryPoints / totalHours).toFixed(2)) : 0;

        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;

        const hoursByProjectMap = {};
        timeEntries.forEach(e => {
            const key = e.project.name;
            hoursByProjectMap[key] = (hoursByProjectMap[key] || 0) + parseFloat(e.hours);
        });

        const tasksByStatus = {
            TODO: tasks.filter(t => t.status === 'TODO').length,
            IN_PROGRESS: inProgressTasks,
            IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW').length,
            COMPLETED: completedTasks,
            BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
        };

        res.json({
            summary: {
                totalTasks, completedTasks, inProgressTasks, overdueTasks,
                completionRate, onTimeRate,
                totalHours: parseFloat(totalHours.toFixed(2)),
                billableHours: parseFloat(billableHours.toFixed(2)),
                approvedHours: parseFloat(approvedHours.toFixed(2)),
                totalStoryPoints, completedStoryPoints,
                velocity,
            },
            tasksByStatus,
            hoursByProject: Object.entries(hoursByProjectMap).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) })),
            recentTasks: tasks.slice(0, 10)
        });
    } catch (error) {
        console.error('Error fetching user performance:', error);
        res.status(500).json({ error: 'Failed to fetch user performance' });
    }
};

export const getProjectPerformance = async (req, res) => {
    const { projectId } = req.params;
    const { dateFrom, dateTo } = req.query;

    try {
        const project = await req.db.project.findFirst({
            where: { id: projectId, organizationId: req.user.organizationId },
        });

        if (!project) return res.status(404).json({ error: 'Project not found' });

        const dateFilter = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);

        const timeWhere = { projectId };
        if (dateFrom || dateTo) timeWhere.date = dateFilter;

        const [tasks, timeEntries] = await Promise.all([
            req.db.task.findMany({
                where: { projectId },
                select: {
                    id: true, title: true, status: true, priority: true,
                    dueDate: true, storyPoints: true, completionPercentage: true,
                    createdAt: true, updatedAt: true,
                    project: { select: { id: true, name: true } },
                },
            }),
            req.db.timeEntry.findMany({
                where: timeWhere,
                select: { hours: true, date: true, billable: true, status: true, user: { select: { id: true, name: true } } },
            })
        ]);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
        const onTimeTasks = tasks.filter(t => t.status === 'COMPLETED' && t.dueDate && new Date(t.updatedAt) <= new Date(t.dueDate)).length;

        const totalHours = timeEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
        const billableHours = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + parseFloat(e.hours), 0);
        const approvedHours = timeEntries.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + parseFloat(e.hours), 0);

        const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedStoryPoints = tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const velocity = totalHours > 0 ? parseFloat((completedStoryPoints / totalHours).toFixed(2)) : 0;

        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;

        const hoursByUserMap = {};
        timeEntries.forEach(e => {
            const key = e.user.name;
            hoursByUserMap[key] = (hoursByUserMap[key] || 0) + parseFloat(e.hours);
        });

        const tasksByStatus = {
            TODO: tasks.filter(t => t.status === 'TODO').length,
            IN_PROGRESS: inProgressTasks,
            IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW').length,
            COMPLETED: completedTasks,
            BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
        };

        res.json({
            projectId,
            projectName: project.name,
            summary: {
                totalTasks, completedTasks, inProgressTasks, overdueTasks,
                completionRate, onTimeRate,
                totalHours: parseFloat(totalHours.toFixed(2)),
                billableHours: parseFloat(billableHours.toFixed(2)),
                approvedHours: parseFloat(approvedHours.toFixed(2)),
                totalStoryPoints, completedStoryPoints,
                velocity,
            },
            tasksByStatus,
            hoursByProject: Object.entries(hoursByUserMap).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) })),
            recentTasks: tasks.slice(0, 10)
        });
    } catch (error) {
        console.error('Error fetching project performance:', error);
        res.status(500).json({ error: 'Failed to fetch project performance' });
    }
};
