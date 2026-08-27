import prisma from '../lib/prisma.js';
import {
    sendNewTicketNotification,
    sendTicketStatusUpdateNotification,
    sendTicketCommentNotification
} from '../services/emailService.js';
import { createNotification, shouldSendEmail } from '../utils/notifications.js';


export const createTicket = async (req, res) => {
    const { title, description, priority } = req.body;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    if (!/[a-zA-Z0-9]/.test(title)) {
        return res.status(400).json({ error: 'Ticket title must contain meaningful alphanumeric characters.' });
    }

    try {
        const ticket = await req.db.ticket.create({
            data: {
                title,
                description,
                priority: priority || 'MEDIUM',
                clientId: req.user.id,
                organizationId: req.user.organizationId,
            },
            include: {
                client: { select: { name: true, email: true } },
            },
        });

        // Notify Admins and Managers
        const staff = await req.db.user.findMany({
            where: {
                organizationId: req.user.organizationId,
                role: { in: ['ADMIN', 'MANAGER'] },
            },
            select: { id: true, email: true },
        });

        console.log(`[Ticket Debug] Target staff for notification: ${staff.length} users. OrgID: ${req.user.organizationId}`);

        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        for (const member of staff) {
            if (member.email) {
                if (await shouldSendEmail(req.db, member.id, 'TICKET_CREATED')) {
                    sendNewTicketNotification(
                        member.email,
                        ticket.title,
                        ticket.description,
                        ticket.priority,
                        ticket.client.name,
                        ticket.id,
                        origin
                    ).catch(err => console.error('Failed to send new ticket notification:', err));
                }
            }

            console.log(`[Ticket Debug] Sending notification to Staff UserID: ${member.id}`);
            await createNotification(req, {
                userId: member.id,
                title: 'New Support Ticket',
                message: `Client ${ticket.client.name} raised a ticket: ${ticket.title}`,
                type: 'TICKET_CREATED',
                link: `/tickets/${ticket.id}`
            });
        }

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};

export const getAllTickets = async (req, res) => {
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
        if (!req.db || !req.db.ticket) {
            if (req.user.role === 'SUPERADMIN') return res.json([]);
            return res.status(500).json({ 
                error: 'Database configuration error',
                message: 'The requested model "Ticket" is not available.'
            });
        }

        const { search, page, limit: rawLimit, status, priority } = req.query;

        const where = { organizationId: req.user.organizationId };

        // Clients only see their own tickets
        if (req.user.role === 'CLIENT') {
            where.clientId = req.user.id;
        }

        if (status && status !== 'ALL') {
            where.status = { equals: status };
        }

        if (priority && priority !== 'ALL') {
            where.priority = { equals: priority };
        }

        // Backend search filter
        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                    ],
                },
            ];
        }

        const include = {
            client: { select: { name: true, email: true, avatar: true } },
        };

        // If page is provided, return paginated response
        if (page) {
            const pageNum = Math.max(1, parseInt(page));
            const limit = Math.max(1, parseInt(rawLimit) || 10);
            const skip = (pageNum - 1) * limit;

            const [tickets, total] = await Promise.all([
                req.db.ticket.findMany({
                    where,
                    include,
                    orderBy: { title: 'asc' },
                    skip,
                    take: limit,
                }),
                req.db.ticket.count({ where }),
            ]);

            return res.json({
                data: tickets,
                pagination: {
                    total,
                    page: pageNum,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }

        // No pagination - return all
        const tickets = await req.db.ticket.findMany({
            where,
            include,
            orderBy: { title: 'asc' },
        });

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

export const getTicket = async (req, res) => {
    const { id } = req.params;

    try {
        const ticket = await req.db.ticket.findFirst({
            where: {
                id,
                organizationId: req.user.organizationId,
            },
            include: {
                client: { select: { id: true, name: true, email: true, avatar: true } },
                comments: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        // Ensure clients can only see their own tickets
        if (req.user.role === 'CLIENT' && ticket.clientId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
};

export const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Only admins or managers can update status' });
    }

    try {
        // Verify ticket belongs to user's organization
        const existingTicket = await req.db.ticket.findFirst({
            where: { id, organizationId: req.user.organizationId }
        });
        if (!existingTicket) return res.status(404).json({ error: 'Ticket not found' });

        const ticket = await req.db.ticket.update({
            where: { id },
            data: { status },
            include: {
                client: { select: { email: true, name: true } }
            }
        });

        // Notify Client
        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        
        if (ticket.client.email) {
            if (await shouldSendEmail(req.db, ticket.clientId, 'TICKET_STATUS_UPDATED')) {
                sendTicketStatusUpdateNotification(
                    ticket.client.email,
                    ticket.title,
                    status,
                    req.user.name,
                    id,
                    origin
                ).catch(err => console.error('Failed to send ticket status update notification:', err));
            }
        }

        await createNotification(req, {
            userId: ticket.clientId,
            title: 'Ticket Status Updated',
            message: `Your ticket "${ticket.title}" status has been updated to ${status.replace('_', ' ')} by ${req.user.name}`,
            type: 'TICKET_STATUS_UPDATED',
            link: `/tickets/${id}`
        });

        res.json(ticket);
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
};

export const addComment = async (req, res) => {
    const { id: ticketId } = req.params;
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        const ticket = await req.db.ticket.findUnique({
            where: { id: ticketId },
            select: { clientId: true, organizationId: true },
        });

        if (!ticket || ticket.organizationId !== req.user.organizationId) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (req.user.role === 'CLIENT' && ticket.clientId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [comment] = await req.db.$transaction([
            req.db.ticketComment.create({
                data: {
                    ticketId,
                    userId: req.user.id,
                    message,
                },
                include: {
                    user: { select: { name: true, email: true, avatar: true } },
                    ticket: {
                        include: {
                            client: { select: { name: true, email: true } }
                        }
                    }
                },
            }),
            req.db.ticket.update({
                where: { id: ticketId },
                data: { updatedAt: new Date() }
            })
        ]);

        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        // Notify relevant parties
        if (req.user.role === 'CLIENT') {
            // Notify staff
            const staff = await req.db.user.findMany({
                where: {
                    organizationId: req.user.organizationId,
                    role: { in: ['ADMIN', 'MANAGER'] },
                },
                select: { id: true, email: true },
            });
            for (const member of staff) {
                if (member.email) {
                    if (await shouldSendEmail(req.db, member.id, 'TICKET_COMMENT')) {
                        sendTicketCommentNotification(
                            member.email,
                            comment.ticket.title,
                            req.user.name,
                            message,
                            ticketId,
                            origin
                        ).catch(err => console.error('Failed to send comment notification to staff:', err));
                    }
                }

                await createNotification(req, {
                    userId: member.id,
                    title: 'New Ticket Comment',
                    message: `${req.user.name} commented on ticket: ${comment.ticket.title}`,
                    type: 'TICKET_COMMENT',
                    link: `/tickets/${ticketId}`
                });
            }
        } else {
            // Staff commented, notify client
            if (comment.ticket.client.email) {
                if (await shouldSendEmail(req.db, comment.ticket.clientId, 'TICKET_COMMENT')) {
                    sendTicketCommentNotification(
                        comment.ticket.client.email,
                        comment.ticket.title,
                        req.user.name,
                        message,
                        ticketId,
                        origin
                    ).catch(err => console.error('Failed to send comment notification to client:', err));
                }
            }

            await createNotification(req, {
                userId: comment.ticket.clientId,
                title: 'New Ticket Comment',
                message: `${req.user.name} commented on your ticket: ${comment.ticket.title}`,
                type: 'TICKET_COMMENT',
                link: `/tickets/${ticketId}`
            });
        }

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};
