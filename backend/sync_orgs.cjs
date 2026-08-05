const { PrismaClient } = require('@prisma/client');
const { PrismaClient: TenantClient } = require('./generated/tenant-client/index.js');
const prismaMain = new PrismaClient();

async function syncOrgs() {
  const orgs = await prismaMain.organization.findMany({
    where: { dbStrategy: 'DEDICATED' }
  });
  console.log('Found ' + orgs.length + ' dedicated orgs.');
  
  for (const org of orgs) {
    if (!org.dbUrl) continue;
    try {
      const tenantClient = new TenantClient({ datasources: { db: { url: org.dbUrl } } });
      const existing = await tenantClient.organization.findUnique({ where: { id: org.id } });
      
      if (!existing) {
        console.log('Seeding org into tenant DB: ' + org.name);
        await tenantClient.organization.create({ data: org });
        console.log('Seeded successfully.');
      } else {
        // Just update rolePermissions in case it's out of sync
        await tenantClient.organization.update({
          where: { id: org.id },
          data: { rolePermissions: org.rolePermissions }
        });
        console.log('Org already exists in tenant DB, synced rolePermissions: ' + org.name);
      }
      await tenantClient.$disconnect();
    } catch(e) {
      console.error('Failed to sync ' + org.name, e.message);
    }
  }
}
syncOrgs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
