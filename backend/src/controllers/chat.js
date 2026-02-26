import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getChatHistory = async (req, res) => {
    const { projectId } = req.query;
    const userId = req.user.id;
    const projId = projectId || null;

    try {
        if (projId) {
            const isAdmin = req.user.role === 'ADMIN';

            if (!isAdmin) {
                const project = await prisma.project.findFirst({
                    where: {
                        id: projId,
                        organizationId: req.user.organizationId,
                    }
                });

                if (!project) return res.status(404).json({ error: 'Project not found' });

                const isManager = project.managerId === userId;
                const isClient = project.clientId === userId;

                const taskAssignment = await prisma.task.findFirst({
                    where: {
                        projectId: projId,
                        assignees: { some: { userId } }
                    }
                });

                const workloadAssignment = await prisma.workload.findFirst({
                    where: { projectId: projId, userId }
                });

                if (!isManager && !isClient && !taskAssignment && !workloadAssignment) {
                    return res.status(403).json({ error: 'Access denied to this project chat' });
                }
            }
        }

        // Persistent unread: Mark room as seen
        // WORKAROUND for nullable unique constraint in upsert
        try {
            const existing = await prisma.chatRoomLastSeen.findFirst({
                where: { userId, projectId: projId }
            });

            if (existing) {
                await prisma.chatRoomLastSeen.update({
                    where: { id: existing.id },
                    data: { lastSeen: new Date() }
                });
            } else {
                await prisma.chatRoomLastSeen.create({
                    data: { userId, projectId: projId, lastSeen: new Date() }
                });
            }
        } catch (err) {
            console.error('[Chat History] Failed to update lastSeen:', err);
            // Non-critical error, continue
        }

        const messages = await prisma.chatMessage.findMany({
            where: {
                projectId: projId,
            },
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
                createdAt: 'asc',
            },
            take: 50,
        });

        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};

export const getChatRooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const organizationId = req.user.organizationId;
        console.log(`[Chat Rooms] User ${userId} fetching rooms`);

        let projects;

        if (req.user.role === 'ADMIN') {
            projects = await prisma.project.findMany({
                where: { organizationId },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
        } else {
            projects = await prisma.project.findMany({
                where: {
                    organizationId,
                    OR: [
                        { managerId: userId },
                        { clientId: userId },
                        { tasks: { some: { assignees: { some: { userId } } } } },
                        { workloads: { some: { userId } } }
                    ]
                },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
        }

        const projectIds = projects.map(p => p.id);

        // Fetch last seen timestamps
        const lastSeenRecords = await prisma.chatRoomLastSeen.findMany({
            where: {
                userId,
                OR: [
                    { projectId: null },
                    { projectId: { in: projectIds } }
                ]
            }
        });

        const lastSeenMap = {};
        lastSeenRecords.forEach(rec => {
            lastSeenMap[rec.projectId || 'global'] = rec.lastSeen;
        });

        // Fetch last message AND unread count for each room
        const roomData = await Promise.all([null, ...projectIds].map(async (id) => {
            const roomKey = id || 'global';
            const lastSeen = lastSeenMap[roomKey];

            try {
                // Get last message
                const lastMsg = await prisma.chatMessage.findFirst({
                    where: { projectId: id },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        content: true,
                        createdAt: true,
                        user: { select: { name: true } }
                    }
                });

                // Count unread 
                const unreadCount = await prisma.chatMessage.count({
                    where: {
                        projectId: id,
                        userId: { not: userId },
                        ...(lastSeen ? { createdAt: { gt: lastSeen } } : {})
                    }
                });

                return { id: roomKey, lastMsg, unreadCount };
            } catch (err) {
                console.error(`Error processing room ${roomKey}:`, err);
                return { id: roomKey, lastMsg: null, unreadCount: 0 };
            }
        }));

        const roomDataMap = roomData.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});

        const response = [
            {
                id: 'global',
                name: 'General Channel',
                isGlobal: true,
                lastMsg: roomDataMap['global']?.lastMsg || null,
                unreadCount: roomDataMap['global']?.unreadCount || 0
            },
            ...projects.map(p => ({
                id: p.id,
                name: p.name,
                isGlobal: false,
                lastMsg: roomDataMap[p.id]?.lastMsg || null,
                unreadCount: roomDataMap[p.id]?.unreadCount || 0
            }))
        ];

        res.json(response);
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({ error: 'Failed to fetch chat rooms internally' });
    }
};
