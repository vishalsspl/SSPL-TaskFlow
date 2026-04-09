import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const logActivity = async ({
    userId,
    organizationId,
    action,
    entity,
    entityId,
    details = {},
}) => {
    try {
        await prisma.activityLog.create({
            data: {
                id: crypto.randomUUID(),
                userId,
                projectId: null,
                action,
                entity,
                entityId,
                details,
                createdAt: new Date(),
            },
        });
    } catch (err) {
        console.error('Activity log failed:', err);
    }
};