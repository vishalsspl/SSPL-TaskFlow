import prisma from '../lib/prisma.js';
import { createNotification, shouldSendEmail } from '../utils/notifications.js';
import { sendTimesheetSubmissionEmail, sendLeaveSubmissionEmail, sendTimesheetStatusEmail, sendLeaveStatusEmail } from '../services/emailService.js';
import { hasPermission } from '../middleware/auth.js';
const include = {
    user: { select: { id: true, name: true, email: true, avatar: true } },
    project: { select: { id: true, name: true } },
    task: { select: { id: true, title: true } },
};

export const getTimeEntries = async (req, res) => {
    try {
        if (!hasPermission(req.user, 'timesheets.view') && !hasPermission(req.user, 'timesheets.viewAll')) {
            return res.status(403).json({ error: 'You do not have permission to view timesheets' });
        }

        // ── Check for tenant DB connection errors ─────────────────────────────
        if (req.tenantDbError) {
            return res.status(503).json({
                error: 'Organization database connection failed',
                message: 'We are having trouble connecting to your organization database.',
            });
        }

        // ── Verify model existence ────────────────────────────────────────────
        if (!req.db || !req.db.timeEntry) {
            if (req.user.role === 'SUPERADMIN') return res.json({ entries: [], attendanceSummary: [] });
            return res.status(500).json({ 
                error: 'Database configuration error',
                message: 'The requested model "TimeEntry" is not available.'
            });
        }

        const { startDate, endDate, userId, projectId, status, page, limit: rawLimit } = req.query;

        const where = {
            project: { organizationId: req.user.organizationId },
        };

    if (startDate && endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.date = { gte: new Date(startDate), lte: end };
    }
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const canViewAll = hasPermission(req.user, 'timesheets.viewAll');

    if (!canViewAll) {
        where.userId = req.user.id;
    } else {
        if (req.user.role === 'MANAGER') {
            where.OR = [
                { userId: req.user.id },
                { project: { managers: { some: { id: req.user.id } } } },
                { user: { managerId: req.user.id } }
            ];
            if (userId) where.userId = userId;
        } else {
            if (userId) where.userId = userId;
        }
    }

    if (page) {
        const pageNum = Math.max(1, parseInt(page));
        const limit = Math.max(1, parseInt(rawLimit) || 10);
        const skip = (pageNum - 1) * limit;

        const [entries, total] = await Promise.all([
            req.db.timeEntry.findMany({ where, include, orderBy: { date: 'desc' }, skip, take: limit }),
            req.db.timeEntry.count({ where }),
        ]);

        const reviewerLogs = await req.db.activityLog.findMany({
            where: {
                entity: 'time_entry',
                entityId: { in: entries.map(e => e.id) },
                action: { in: ['APPROVED', 'REJECTED'] }
            },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        });
        const reviewerMap = {};
        for (const log of reviewerLogs) {
            if (!reviewerMap[log.entityId]) reviewerMap[log.entityId] = log.user;
        }
        const entriesWithReviewer = entries.map(e => ({
            ...e,
            reviewer: reviewerMap[e.id] || null
        }));

        return res.json({
            data: entriesWithReviewer,
            pagination: { total, page: pageNum, limit, totalPages: Math.ceil(total / limit) },
        });
    }

    const attendancePromise = req.db.attendance 
        ? req.db.attendance.findMany({
            where: {
                userId: where.userId || (req.user.role === 'MEMBER' ? req.user.id : undefined),
                organizationId: req.user.organizationId,
                clockIn: where.date
            },
            select: { clockIn: true, durationMinutes: true }
        })
        : Promise.resolve([]);

    const [entries, attendanceSummary] = await Promise.all([
        req.db.timeEntry.findMany({ where, include, orderBy: { date: 'desc' } }),
        attendancePromise
    ]);

        const reviewerLogs = await req.db.activityLog.findMany({
            where: {
                entity: 'time_entry',
                entityId: { in: entries.map(e => e.id) },
                action: { in: ['APPROVED', 'REJECTED'] }
            },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        });
        const reviewerMap = {};
        for (const log of reviewerLogs) {
            if (!reviewerMap[log.entityId]) reviewerMap[log.entityId] = log.user;
        }
        const entriesWithReviewer = entries.map(e => ({
            ...e,
            reviewer: reviewerMap[e.id] || null
        }));

        res.json({
            entries: entriesWithReviewer,
            attendanceSummary: attendanceSummary.map(a => ({
                date: a.clockIn,
                hours: (a.durationMinutes || 0) / 60
            }))
        });
    } catch (error) {
        console.error('Error in getTimeEntries:', error);
        import('fs').then(fs => fs.appendFileSync('debug_trace.log', 'getTimeEntries ERROR: ' + error.stack + '\n'));
        res.status(500).json({ error: 'Failed to fetch time entries', message: error.message });
    }
};

export const createTimeEntry = async (req, res) => {
    let { projectId, taskId, date, hours, description, billable = true } = req.body;

    const LEAVE_TAGS = ['[Sick Leave]', '[Casual Leave]', '[Paid Leave]', '[Unpaid Leave]'];
    const isLeaveEntry = description && LEAVE_TAGS.some(tag => description.includes(tag));

    if (!date || !hours) {
        return res.status(400).json({ error: 'Date and hours are required' });
    }

    if (!isLeaveEntry && (!projectId || !taskId)) {
        return res.status(400).json({ error: 'Project, task, date, and hours are required' });
    }

    if (isLeaveEntry) {
        // Database schema requires projectId and taskId. We automatically assign leave logs to a system project.
        let leaveProject = await req.db.project.findFirst({
            where: { name: 'Leave Tracker', organizationId: req.user.organizationId }
        });
        if (!leaveProject) {
            leaveProject = await req.db.project.create({
                data: {
                    name: 'Leave Tracker',
                    description: 'System project for tracking leaves',
                    category: 'INTERNAL',
                    organizationId: req.user.organizationId
                }
            });
        }

        let leaveTask = await req.db.task.findFirst({
            where: { projectId: leaveProject.id, title: 'Leave Log' }
        });
        if (!leaveTask) {
            leaveTask = await req.db.task.create({
                data: {
                    title: 'Leave Log',
                    projectId: leaveProject.id,
                    type: 'TASK'
                }
            });
        }

        projectId = leaveProject.id;
        taskId = leaveTask.id;
    }

    const entryDate = new Date(date);
    const now = new Date();

    if (entryDate > now) {
        if (!isLeaveEntry) {
            return res.status(400).json({ error: 'Cannot log work hours for future dates. Only leave entries are allowed for future dates.' });
        }
        const maxFutureDate = new Date();
        maxFutureDate.setDate(maxFutureDate.getDate() + 31);
        if (entryDate > maxFutureDate) {
            return res.status(400).json({ error: 'Cannot log leave more than 31 days in advance.' });
        }
    }

    // Verify project/task belongs to user's organization if provided
    let project = null;
    if (projectId) {
        project = await req.db.project.findFirst({
            where: { id: projectId, organizationId: req.user.organizationId },
            include: { managers: { select: { id: true } } }
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });
    }

    if (taskId && projectId) {
        const task = await req.db.task.findFirst({
            where: { id: taskId, projectId }
        });
        if (!task) return res.status(400).json({ error: 'Invalid task for this project' });
    }

    // --- Validation: Prevent logging more than 24 hours per day ---
    const startOfDay = new Date(entryDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(entryDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingEntries = await req.db.timeEntry.findMany({
        where: {
            userId: req.user.id,
            date: { gte: startOfDay, lte: endOfDay }
        }
    });
    const totalLoggedHours = existingEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
    const requestedHours = parseFloat(hours);

    if (totalLoggedHours + requestedHours > 24) {
        return res.status(400).json({ error: "You can't add hours above 24 hours in a single day." });
    }
    // --------------------------------------------------------------


    const entry = await req.db.timeEntry.create({
        data: {
            userId: req.user.id,
            projectId: projectId || null,
            taskId: taskId || null,
            date: new Date(date),
            hours: parseFloat(hours),
            description,
            status: 'PENDING',
            billable,
            isManual: true,
        },
        include,
    });

    // Log activity
    try {
        const logData = {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            projectId,
            action: 'LOGGED_TIME',
            entity: 'time_entry',
            entityId: entry.id,
            details: { hours, date },
        };

        // 1. Log to tenant DB
        await req.db.activityLog.create({ data: logData });

        // 2. Log to main DB for SuperAdmin visibility
        await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
        console.error('[CreateTimeEntry] Failed to log activity:', logErr.message);
    }

    let targetManagers = [];

    if (isLeaveEntry) {
        const currentUser = await req.db.user.findUnique({
            where: { id: req.user.id },
            select: { managerId: true }
        });
        
        if (currentUser?.managerId) {
            targetManagers.push(currentUser.managerId);
        } else {
            // Fallback to all admins if no direct manager is assigned
            const admins = await req.db.user.findMany({
                where: { organizationId: req.user.organizationId, role: { in: ['ADMIN', 'MANAGER'] } },
                select: { id: true }
            });
            targetManagers = admins.map(a => a.id);
        }
    } else {
        if (project?.managers) {
            targetManagers.push(...project.managers.map(m => m.id));
        }
    }

    // Remove self from notifications to avoid notifying yourself of your own submission
    targetManagers = [...new Set(targetManagers.filter(id => id !== req.user.id))];

    if (targetManagers.length > 0) {
        const managers = await req.db.user.findMany({
            where: { id: { in: targetManagers } },
            select: { id: true, email: true, name: true }
        });
        
        for (const manager of managers) {
            await createNotification(req, {
                userId: manager.id,
                title: isLeaveEntry ? 'Leave Requires Approval' : 'Timesheet Requires Approval',
                message: isLeaveEntry 
                    ? `${req.user.name} applied for leave on ${date}` 
                    : `${req.user.name} logged ${hours}h on ${project?.name || 'Project'}`,
                type: isLeaveEntry ? 'LEAVE_SUBMITTED' : 'WORKLOG_SUBMITTED' 
            });

            const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
            const eventType = isLeaveEntry ? 'LEAVE_SUBMITTED' : 'WORKLOG_SUBMITTED';
            
            if (await shouldSendEmail(req.db, manager.id, eventType)) {
                if (isLeaveEntry) {
                    // Extract leave type from description e.g. "[Sick Leave] - [Full Day]"
                    const match = description.match(/\[(.*?)\]/);
                    const leaveType = match ? match[1] : 'Leave';
                    await sendLeaveSubmissionEmail(manager.email, manager.name, req.user.name, leaveType, hours, date, origin);
                } else {
                    await sendTimesheetSubmissionEmail(manager.email, manager.name, req.user.name, project?.name || 'Project', hours, date, origin);
                }
            }
        }
    }

    res.status(201).json(entry);
};

export const updateTimeEntry = async (req, res) => {
    const { id } = req.params;
    const { hours, description, billable } = req.body;

    const existingEntry = await req.db.timeEntry.findUnique({
        where: { id },
        include: { project: true },
    });

    if (!existingEntry) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    if (existingEntry.project && existingEntry.project.organizationId !== req.user.organizationId) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    const isOwner = existingEntry.userId === req.user.id;
    if (!isOwner && req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const data = {};
    if (hours !== undefined) {
        const requestedHours = parseFloat(hours);
        
        // --- Validation: Prevent logging more than 24 hours per day ---
        const entryDate = new Date(existingEntry.date);
        const startOfDay = new Date(entryDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(entryDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const otherEntries = await req.db.timeEntry.findMany({
            where: {
                userId: existingEntry.userId,
                date: { gte: startOfDay, lte: endOfDay },
                id: { not: id } // exclude the current entry
            }
        });
        
        const totalLoggedHours = otherEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
        
        if (totalLoggedHours + requestedHours > 24) {
            return res.status(400).json({ error: "You can't add hours above 24 hours in a single day." });
        }
        // --------------------------------------------------------------
        
        data.hours = requestedHours;
    }
    if (description !== undefined) data.description = description;
    if (billable !== undefined) data.billable = billable;

    const entry = await req.db.timeEntry.update({ where: { id }, data, include });
    
    // Log activity
    try {
        const logData = {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            projectId: existingEntry.projectId,
            action: 'UPDATED',
            entity: 'time_entry',
            entityId: entry.id,
            details: { previousHours: existingEntry.hours, newHours: entry.hours, changes: req.body },
        };

        // 1. Log to tenant DB
        await req.db.activityLog.create({ data: logData });

        // 2. Log to main DB for SuperAdmin visibility
        await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
        console.error('[UpdateTimeEntry] Failed to log activity:', logErr.message);
    }

    res.json(entry);
};

export const updateTimeEntryStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    if (!hasPermission(req.user, 'timesheets.approve')) {
        return res.status(403).json({ error: 'You do not have permission to approve timesheets' });
    }

    const existingEntry = await req.db.timeEntry.findUnique({
        where: { id },
        include: { project: true, user: true },
    });

    if (!existingEntry) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    if (existingEntry.project && existingEntry.project.organizationId !== req.user.organizationId) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    const entry = await req.db.timeEntry.update({ where: { id }, data: { status }, include });

    // Ensure we don't notify loop if the user approves their own entry (if they are a manager acting as admin)
    if (existingEntry.userId !== req.user.id && (status === 'APPROVED' || status === 'REJECTED')) {
        const isLeaveEntry = existingEntry.project?.name === 'Leave Tracker';

        await createNotification(req, {
            userId: existingEntry.userId,
            title: isLeaveEntry ? `Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'}` : `Timesheet ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
            message: isLeaveEntry 
                ? `Your leave request has been ${status.toLowerCase()}` 
                : `Your time log for ${existingEntry.project?.name || 'Leave'} has been ${status.toLowerCase()}`,
            type: isLeaveEntry ? `LEAVE_${status}` : `TIMESHEET_${status}`
        });

        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        const eventType = isLeaveEntry ? `LEAVE_${status}` : `TIMESHEET_${status}`;
        
        if (await shouldSendEmail(req.db, existingEntry.userId, eventType)) {
            if (isLeaveEntry) {
                const match = existingEntry.description?.match(/\[(.*?)\]/);
                const leaveType = match ? match[1] : 'Leave';
                await sendLeaveStatusEmail(
                    existingEntry.user.email,
                    existingEntry.user.name,
                    leaveType,
                    status,
                    req.user.name,
                    existingEntry.hours,
                    origin
                );
            } else {
                await sendTimesheetStatusEmail(
                    existingEntry.user.email,
                    existingEntry.user.name,
                    existingEntry.project?.name || 'Leave',
                    status,
                    req.user.name,
                    existingEntry.hours,
                    origin
                );
            }
        }
    }

    // Log activity
    try {
        const logData = {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            projectId: existingEntry.projectId,
            action: status === 'APPROVED' ? 'APPROVED' : (status === 'REJECTED' ? 'REJECTED' : 'UPDATED_STATUS'),
            entity: 'time_entry',
            entityId: entry.id,
            details: { 
                previousStatus: existingEntry.status, 
                newStatus: status,
                hours: existingEntry.hours,
                userName: existingEntry.user.name
            },
        };

        // 1. Log to tenant DB
        await req.db.activityLog.create({ data: logData });

        // 2. Log to main DB for SuperAdmin visibility
        await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
        console.error('[UpdateTimeEntryStatus] Failed to sync activity:', logErr.message);
    }

    res.json(entry);
};

export const deleteTimeEntry = async (req, res) => {
    const { id } = req.params;

    const existingEntry = await req.db.timeEntry.findUnique({
        where: { id },
        include: { project: true },
    });

    if (!existingEntry) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    if (existingEntry.project && existingEntry.project.organizationId !== req.user.organizationId) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    if (existingEntry.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Log deletion BEFORE deleting from database
    try {
        const logData = {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            projectId: existingEntry.projectId,
            action: 'DELETED',
            entity: 'time_entry',
            entityId: id,
            details: { hours: existingEntry.hours, date: existingEntry.date },
        };

        // 1. Log to tenant DB
        await req.db.activityLog.create({ data: logData });

        // 2. Log to main DB for SuperAdmin visibility
        await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
        console.error('[DeleteTimeEntry] Failed to log activity:', logErr.message);
    }

    await req.db.timeEntry.delete({ where: { id } });
    res.json({ message: 'Time entry deleted successfully' });
};

// ── WorkLog (task-level granular logging) ─────────────────────────────────

export const getWorkLogs = async (req, res) => {
    const { taskId, userId } = req.query;

    const where = {
        project: { organizationId: req.user.organizationId }
    };
    if (taskId) where.taskId = taskId;
    if (userId) where.userId = userId;
    if (req.user.role === 'MEMBER') where.userId = req.user.id;

    const logs = await req.db.workLog.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, avatar: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
        },
        orderBy: { loggedAt: 'desc' },
    });

    res.json(logs);
};

export const createWorkLog = async (req, res) => {
    const { taskId, projectId, minutes, comment } = req.body;

    if (!taskId || !projectId || !minutes) {
        return res.status(400).json({ error: 'Task, project, and minutes are required' });
    }

    // Verify project/task belongs to user's organization
    const project = await req.db.project.findFirst({
        where: { id: projectId, organizationId: req.user.organizationId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const task = await req.db.task.findFirst({
        where: { id: taskId, projectId }
    });
    if (!task) return res.status(400).json({ error: 'Invalid task for this project' });

    const log = await req.db.workLog.create({
        data: {
            userId: req.user.id,
            taskId,
            projectId,
            minutes: parseInt(minutes),
            comment,
        },
        include: {
            user: { select: { id: true, name: true, avatar: true } },
            task: { select: { id: true, title: true } },
        },
    });

    // Log activity
    try {
        const logData = {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            projectId,
            action: 'LOGGED_TIME',
            entity: 'worklog',
            entityId: log.id,
            details: { minutes, comment, method: 'manual' },
        };

        // 1. Log to tenant DB
        await req.db.activityLog.create({ data: logData });

        // 2. Log to main DB for SuperAdmin visibility
        await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
        console.error('[CreateWorkLog] Failed to log activity:', logErr.message);
    }

    res.status(201).json(log);
};

export const deleteWorkLog = async (req, res) => {
    const { id } = req.params;

    const log = await req.db.workLog.findFirst({
        where: { id },
        include: { project: true }
    });
    if (!log || log.project.organizationId !== req.user.organizationId) {
        return res.status(404).json({ error: 'Work log not found' });
    }
    if (log.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    await req.db.workLog.delete({ where: { id } });
    res.json({ message: 'Work log deleted' });
};

// ── Performance ───────────────────────────────────────────────────────────

export const getUserPerformance = async (req, res) => {
    const { userId } = req.params;
    const { projectId, dateFrom, dateTo } = req.query;
    const orgId = req.user.organizationId;

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

    const attendancePromise = req.db.attendance
        ? req.db.attendance.findMany({
            where: { 
                userId, 
                organizationId: orgId,
                clockIn: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
            },
            select: { durationMinutes: true }
        })
        : Promise.resolve([]);

    const [tasks, timeEntries, workLogs, attendanceLogs] = await Promise.all([
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
        }),
        req.db.workLog.findMany({
            where: { userId, project: { organizationId: orgId } },
            select: { minutes: true, loggedAt: true, task: { select: { id: true, title: true } } },
        }),
        attendancePromise,
    ]);

    const attendanceHours = attendanceLogs.reduce((sum, log) => sum + ((log.durationMinutes || 0) / 60), 0);

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

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;

    const hoursByProject = {};
    timeEntries.forEach(e => {
        const key = e.project.name;
        hoursByProject[key] = (hoursByProject[key] || 0) + parseFloat(e.hours);
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
            totalHours: parseFloat(attendanceHours.toFixed(2)), // Use attendance duration
            taskLoggedHours: parseFloat(totalHours.toFixed(2)), // Keep original as separate field
            billableHours: parseFloat(billableHours.toFixed(2)),
            approvedHours: parseFloat(approvedHours.toFixed(2)),
            totalStoryPoints, completedStoryPoints,
            velocity: completedStoryPoints,
        },
        tasksByStatus,
        hoursByProject: Object.entries(hoursByProject).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) })),
        recentTasks: tasks.slice(0, 10),
        workLogs: workLogs.slice(0, 20),
    });
};

export const getTeamPerformance = async (req, res) => {
    const { projectId, dateFrom, dateTo } = req.query;
    const orgId = req.user.organizationId;

    const users = await req.db.user.findMany({
        where: { organizationId: orgId, isApproved: true, role: { in: ['MEMBER', 'MANAGER'] } },
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

        const attendancePromise = req.db.attendance
            ? req.db.attendance.findMany({
                where: { 
                    userId: u.id, 
                    organizationId: orgId,
                    clockIn: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
                },
                select: { durationMinutes: true }
            })
            : Promise.resolve([]);

        const [tasks, timeEntries, attendanceLogs] = await Promise.all([
            req.db.task.findMany({ where: taskWhere, select: { status: true, dueDate: true, storyPoints: true, updatedAt: true } }),
            req.db.timeEntry.findMany({ where: timeWhere, select: { hours: true, billable: true } }),
            attendancePromise
        ]);

        const attendanceHours = attendanceLogs.reduce((sum, log) => sum + ((log.durationMinutes || 0) / 60), 0);
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
        // Previously: const totalHours = timeEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
        const totalHours = attendanceHours; 
        const velocity = tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

        return {
            user: u,
            totalTasks: tasks.length,
            completedTasks: completed,
            overdueTasks: overdue,
            totalHours: parseFloat(totalHours.toFixed(2)),
            velocity,
            completionRate,
        };
    }));

    res.json(teamStats);
};