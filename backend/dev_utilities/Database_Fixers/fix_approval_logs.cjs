const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllApprovalLogs() {
  console.log('🔄 Fixing Main DB Activity Logs...');
  const mainLogs = await prisma.activityLog.findMany({
    where: { entity: 'task', action: 'UPDATED' }
  });
  
  let mainUpdated = 0;
  for (const log of mainLogs) {
    if (log.details && (log.details.status === 'COMPLETED' || log.details.action === 'Task Approved')) {
      await prisma.activityLog.update({
        where: { id: log.id },
        data: { action: 'APPROVED' }
      });
      mainUpdated++;
    }
  }
  console.log(`✅ Main DB: Updated ${mainUpdated} records.`);

  const orgs = await prisma.organization.findMany({
    where: { dbUrl: { not: null } }
  });

  const { PrismaClient: TenantClient } = require('../../generated/tenant-client');

  for (const org of orgs) {
    try {
      console.log(`🔄 Fixing Tenant DB for ${org.name}...`);
      const tenantPrisma = new TenantClient({
        datasources: { db: { url: org.dbUrl } }
      });
      const tenantLogs = await tenantPrisma.activityLog.findMany({
        where: { entity: 'task', action: 'UPDATED' }
      });

      let tenantUpdated = 0;
      for (const log of tenantLogs) {
        if (log.details && (log.details.status === 'COMPLETED' || log.details.action === 'Task Approved')) {
          await tenantPrisma.activityLog.update({
            where: { id: log.id },
            data: { action: 'APPROVED' }
          });
          tenantUpdated++;
        }
      }
      console.log(`✅ Tenant DB (${org.name}): Updated ${tenantUpdated} records.`);
      await tenantPrisma.$disconnect();
    } catch (err) {
      console.error(`❌ Error updating tenant DB (${org.name}):`, err.message);
    }
  }

  await prisma.$disconnect();
  console.log('🎉 All Activity Logs migration completed successfully!');
}

fixAllApprovalLogs();
