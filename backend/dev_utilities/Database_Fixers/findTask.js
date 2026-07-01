import { PrismaClient as MainPrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../../generated/tenant-client/index.js';

async function main() {
  const mainPrisma = new MainPrismaClient();
  const orgs = await mainPrisma.organization.findMany({
    where: { dbStrategy: 'DEDICATED' }
  });

  for (const org of orgs) {
    if (!org.dbUrl) continue;
    const tenantPrisma = new TenantPrismaClient({
      datasources: { db: { url: org.dbUrl } }
    });
    
    try {
      const task = await tenantPrisma.task.findFirst({
        where: { title: { contains: 'Testing dashboard' } }
      });
      if (task) {
        console.log(`Found in ${org.name}:`, task);
      }
    } catch(e) {}
    await tenantPrisma.$disconnect();
  }
  await mainPrisma.$disconnect();
}

main();
