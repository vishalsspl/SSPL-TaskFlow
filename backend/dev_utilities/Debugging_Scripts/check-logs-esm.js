import prisma from './src/lib/prisma.js';

async function main() {
  console.log('--- Checking ActivityLogs ---');
  try {
    const totalLogs = await prisma.activityLog.count();
    console.log('Total logs:', totalLogs);

    const logs = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        organization: { select: { name: true } }
      }
    });

    console.log('Recent 5 logs:');
    console.log(JSON.stringify(logs, null, 2));

    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    console.log('Orgs:', orgs);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
