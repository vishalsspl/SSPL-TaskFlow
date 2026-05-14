import prisma from '../lib/prisma.js';
import { ensureChatSchema } from '../lib/schemaValidator.js';

export const getChatHistory = async (req, res) => {
    const { projectId } = req.query;
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    const projId = projectId || null;

    // ── Lazy Migration ────────────────────────────────────────────────────────
    await ensureChatSchema(req.db);

    try {
        if (projId) {
            const isAdmin = req.user.role === 'ADMIN';

            if (!isAdmin) {
                if (projId.startsWith('dm_')) {
                    const ids = projId.replace('dm_', '').split('_');
                    if (!ids.includes(userId)) {
                        return res.status(403).json({ error: 'Access denied to this direct message' });
                    }
                } else {
                    const project = await req.db.project.findFirst({
                        where: {
                            id: projId,
                            organizationId,
                        }
                    });

                    if (!project) return res.status(404).json({ error: 'Project not found' });

                    const isManager = project.managerId === userId;
                    const isClient = project.clientId === userId;

                    const taskAssignment = await req.db.task.findFirst({
                        where: {
                            projectId: projId,
                            assignees: { some: { userId } }
                        }
                    });

                    const workloadAssignment = await req.db.workload.findFirst({
                        where: { projectId: projId, userId }
                    });

                    if (!isManager && !isClient && !taskAssignment && !workloadAssignment) {
                        return res.status(403).json({ error: 'Access denied to this project chat' });
                    }
                }
            }
        }

        // Persistent unread: Mark room as seen
        try {
            const existing = await req.db.chatRoomLastSeen.findFirst({
                where: { userId, projectId: projId, organizationId }
            });

            if (existing) {
                await req.db.chatRoomLastSeen.update({
                    where: { id: existing.id },
                    data: { lastSeen: new Date() }
                });
            } else {
                await req.db.chatRoomLastSeen.create({
                    data: { userId, projectId: projId, organizationId, lastSeen: new Date() }
                });
            }
        } catch (err) {
            console.error('[Chat History] Failed to update lastSeen:', err);
        }

        const messages = await req.db.chatMessage.findMany({
            where: {
                projectId: projId,
                organizationId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                parent: {
                    include: {
                        user: {
                            select: { id: true, name: true }
                        }
                    }
                }
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
    // ── Lazy Migration ────────────────────────────────────────────────────────
    await ensureChatSchema(req.db);

    try {
        const userId = req.user.id;
        const organizationId = req.user.organizationId;
        console.log(`[Chat Rooms] User ${userId} fetching rooms for org ${organizationId}`);

        let projects;

        if (req.user.role === 'ADMIN') {
            projects = await req.db.project.findMany({
                where: { organizationId },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
        } else {
            // Non-superadmins MUST have an organizationId
            if (!organizationId) {
                console.warn(`[Chat Rooms] Non-admin user ${userId} has no organizationId`);
                return res.json([]);
            }

            projects = await req.db.project.findMany({
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

        // Fetch DM rooms
        const dmRoomsData = await req.db.chatMessage.findMany({
            where: {
                organizationId,
                projectId: { startsWith: 'dm_' },
                projectId: { contains: userId }
            },
            select: { projectId: true },
            distinct: ['projectId']
        });

        const dmProjectIds = dmRoomsData.map(dm => dm.projectId);

        // Fetch last seen timestamps
        const lastSeenRecords = await req.db.chatRoomLastSeen.findMany({
            where: {
                userId,
                organizationId,
                OR: [
                    { projectId: null },
                    { projectId: { in: [...projectIds, ...dmProjectIds] } }
                ]
            }
        });

        const lastSeenMap = {};
        lastSeenRecords.forEach(rec => {
            lastSeenMap[rec.projectId || 'global'] = rec.lastSeen;
        });

        // Fetch last message AND unread count for each room (global, projects, and DMs)
        const roomData = await Promise.all([null, ...projectIds, ...dmProjectIds].map(async (id) => {
            const roomKey = id || 'global';
            const lastSeen = lastSeenMap[roomKey];

            try {
                // Get last message within organization
                const lastMsg = await req.db.chatMessage.findFirst({
                    where: { projectId: id, organizationId },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        content: true,
                        createdAt: true,
                        user: { select: { name: true } }
                    }
                });

                // Count unread within organization
                const unreadCount = await req.db.chatMessage.count({
                    where: {
                        projectId: id,
                        organizationId,
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

        // Fetch other user names for DMs
        const dmRooms = await Promise.all(dmProjectIds.map(async (dmId) => {
            const ids = dmId.replace('dm_', '').split('_');
            const otherUserId = ids.find(id => id !== userId);
            let otherUserName = 'Unknown User';
            
            if (otherUserId) {
                const otherUser = await req.db.user.findUnique({ where: { id: otherUserId }, select: { name: true } });
                if (otherUser) otherUserName = otherUser.name;
            }

            return {
                id: dmId,
                name: otherUserName,
                isGlobal: false,
                isDM: true,
                lastMsg: roomDataMap[dmId]?.lastMsg || null,
                unreadCount: roomDataMap[dmId]?.unreadCount || 0
            };
        }));

        const response = [
            {
                id: 'global',
                name: 'General Channel',
                isGlobal: true,
                isDM: false,
                lastMsg: roomDataMap['global']?.lastMsg || null,
                unreadCount: roomDataMap['global']?.unreadCount || 0
            },
            ...projects.map(p => ({
                id: p.id,
                name: p.name,
                isGlobal: false,
                isDM: false,
                lastMsg: roomDataMap[p.id]?.lastMsg || null,
                unreadCount: roomDataMap[p.id]?.unreadCount || 0
            })),
            ...dmRooms
        ];

        res.json(response);
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({ error: 'Failed to fetch chat rooms internally' });
    }
};
