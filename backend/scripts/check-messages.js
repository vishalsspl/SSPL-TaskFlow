import { PrismaClient } from '../generated/tenant-client/index.js';
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:password@localhost:5432/taskflow_tenant" } } });

async function main() {
  const count = await prisma.chatMessage.count();
  console.log('Total Chat Messages:', count);
  const last5 = await prisma.chatMessage.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } }
  });
  console.log('Last 5 messages:', JSON.stringify(last5, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
