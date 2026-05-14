import { PrismaClient } from '../generated/tenant-client/index.js';
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:password@localhost:5432/taskflow_tenant" } } });

async function main() {
  const count = await prisma.project.count();
  console.log('Total Projects in Tenant DB:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
