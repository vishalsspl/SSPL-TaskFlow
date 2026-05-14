import { PrismaClient } from '../generated/tenant-client/index.js';
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:password@localhost:5432/taskflow_tenant" } } });

async function main() {
  const count = await prisma.activityLog.count({ where: { action: 'MESSAGE_SENT' } });
  console.log('Total MESSAGE_SENT logs:', count);
  const logs = await prisma.activityLog.findMany({
    where: { action: 'MESSAGE_SENT' },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Last 5 message logs:', JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
