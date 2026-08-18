import prisma from '../lib/prisma.js';
import { createNotification } from '../utils/notifications.js';
import { sendTimesheetSubmissionEmail } from '../services/emailService.js';

/**
 * Get worklogs with filters
 */
export const getWorklogs = async (req, res) => {
    const { taskId, userId, projectId, startDate, endDate } = req.query;

    try {
        const where = {
            project: {
                organizationId: req.user.organizationId
            }
        };

        if (taskId) where.taskId = taskId;
        if (userId) where.userId = userId;
        if (projectId) where.projectId = projectId;
        
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            where.loggedAt = {
                gte: new Date(startDate),
                lte: end
            };
        }

        const worklogs = await req.db.workLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } },
                task: { select: { id: true, title: true } }
            },
            orderBy: { loggedAt: 'desc' }
        });

        res.json(worklogs);
    } catch (error) {
        console.error('Error fetching worklogs:', error);
        res.status(500).json({ error: 'Failed to fetch worklogs' });
    }
};

/**
 * Add a new worklog entry
 */
export const addWorklog = async (req, res) => {
    const { projectId, taskId, date, hours, description, minutes: rawMinutes, comment } = req.body;

    if (!projectId || !taskId || (!hours && !rawMinutes)) {
        return res.status(400).json({ error: 'Project, task, and time are required' });
    }

    try {
        // Verify project/task belongs to user's organization
        const project = await req.db.project.findFirst({
            where: { id: projectId, organizationId: req.user.organizationId },
            select: { id: true, name: true, managers: { select: { id: true, email: true, name: true } } }
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const task = await req.db.task.findFirst({
            where: { id: taskId, projectId },
            select: { id: true, title: true }
        });
        if (!task) return res.status(400).json({ error: 'Invalid task for this project' });

        const minutes = rawMinutes || Math.round(parseFloat(hours) * 60);

        const worklog = await req.db.workLog.create({
            data: {
                userId: req.user.id,
                projectId,
                taskId,
                loggedAt: date ? new Date(date) : new Date(),
                minutes,
                comment: comment || description
            },
            include: {
                task: { select: { title: true } },
                project: { select: { name: true } }
            }
        });

        // Also create a TimeEntry so it appears in the "To Approve" tab
        const hoursValue = parseFloat((minutes / 60).toFixed(2));
        await req.db.timeEntry.create({
            data: {
                userId: req.user.id,
                projectId,
                taskId,
                date: date ? new Date(date) : new Date(),
                hours: hoursValue,
                description: comment || description || 'Timer log',
                status: 'PENDING',
                billable: true,
                isManual: false,
            },
        });

        // Audit Log Entry
        try {
            const logData = {
                userId: req.user.id,
                organizationId: req.user.organizationId,
                projectId,
                action: 'LOGGED_TIME',
                entity: 'worklog',
                entityId: worklog.id,
                details: { 
                    hours: hoursValue, 
                    date: date || new Date().toISOString(),
                    method: 'timer',
                    taskTitle: task.title
                },
            };

            // 1. Log to tenant DB
            await req.db.activityLog.create({ data: logData });

            // 2. Log to main DB for SuperAdmin visibility
            await prisma.activityLog.create({ data: logData });
        } catch (logErr) {
            console.error('[AddWorklog] Failed to log activity:', logErr.message);
        }

        // Notify project managers if someone else logs time
        if (project.managers && project.managers.length > 0) {
            const managersToNotify = project.managers.filter(m => m.id !== req.user.id);
            for (const manager of managersToNotify) {
                await createNotification(req, {
                    userId: manager.id,
                    title: 'New Worklog Submitted',
                    message: `${req.user.name} logged ${hoursValue}h on "${task.title}" in ${project.name}`,
                    type: 'WORKLOG_SUBMITTED',
                    link: '/timesheets'
                });

                if (manager.email) {
                    await sendTimesheetSubmissionEmail(
                        manager.email,
                        manager.name,
                        req.user.name,
                        project.name,
                        hoursValue,
                        date || new Date().toISOString()
                    );
                }
            }
        }

        res.status(201).json(worklog);
    } catch (error) {
        console.error('Error adding worklog:', error);
        res.status(500).json({ error: 'Failed to add worklog' });
    }
};

/**
 * Update a worklog entry
 */
export const updateWorklog = async (req, res) => {
    const { id } = req.params;
    const { hours, minutes: rawMinutes, comment, description, date } = req.body;

    try {
        const existing = await req.db.workLog.findUnique({
            where: { id },
            include: { project: true }
        });

        if (!existing || existing.project.organizationId !== req.user.organizationId) {
            return res.status(404).json({ error: 'Worklog not found' });
        }

        if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const minutes = rawMinutes || (hours !== undefined ? Math.round(parseFloat(hours) * 60) : undefined);

        const worklog = await req.db.workLog.update({
            where: { id },
            data: {
                minutes,
                comment: comment || description,
                loggedAt: date ? new Date(date) : undefined
            }
        });

        res.json(worklog);
    } catch (error) {
        console.error('Error updating worklog:', error);
        res.status(500).json({ error: 'Failed to update worklog' });
    }
};

/**
 * Delete a worklog entry
 */
export const deleteWorklog = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await req.db.workLog.findUnique({
            where: { id },
            include: { project: true }
        });

        if (!existing || existing.project.organizationId !== req.user.organizationId) {
            return res.status(404).json({ error: 'Worklog not found' });
        }

        if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await req.db.workLog.delete({ where: { id } });

        res.json({ message: 'Worklog deleted successfully' });
    } catch (error) {
        console.error('Error deleting worklog:', error);
        res.status(500).json({ error: 'Failed to delete worklog' });
    }
};
