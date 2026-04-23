import prisma from '../src/lib/prisma.js';

async function main() {
    try {
        const logs = await prisma.activityLog.findMany({
            where: { entity: 'TICKET' },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${logs.length} ticket-related activity logs.`);
        logs.forEach(log => {
            console.log(`- Action: ${log.action}, Org: ${log.organizationId}, User: ${log.userId}, At: ${log.createdAt}`);
        });

        const latestOrgId = logs[0]?.organizationId;
        if (latestOrgId) {
            const org = await prisma.organization.findUnique({
                where: { id: latestOrgId }
            });
            console.log(`Latest activity for org: ${org?.name} (${org?.dbUrl})`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
