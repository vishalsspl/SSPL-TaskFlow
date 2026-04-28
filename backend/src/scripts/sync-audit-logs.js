import prisma from '../lib/prisma.js';
import tenantDbManager from '../lib/tenantDbManager.js';

async function syncAuditLogs() {
  console.log('🚀 Starting Audit Log Synchronization (Tenant DBs -> Main DB)...');

  try {
    // 1. Fetch all organizations with dedicated databases
    const orgs = await prisma.organization.findMany({
      where: { dbUrl: { not: null }, dbStrategy: 'DEDICATED' }
    });

    console.log(`Found ${orgs.length} organizations to sync.`);

    for (const org of orgs) {
      console.log(`\n📦 Syncing Audit Logs for Org: ${org.name} (${org.id})`);
      
      let tenantDb;
      try {
        tenantDb = await tenantDbManager.getClient(org.dbUrl);
      } catch (err) {
        console.error(`❌ Failed to connect to tenant DB for ${org.name}:`, err.message);
        continue;
      }

      // 2. Fetch ALL logs from the TENANT DB
      const tenantLogs = await tenantDb.activityLog.findMany();

      console.log(`Found ${tenantLogs.length} relevant logs in Tenant DB.`);

      let createdCount = 0;
      let skippedCount = 0;

      for (const log of tenantLogs) {
        try {
          // 3. Enrichment: If it's a project log and details.name is missing, try to fetch it
          let details = log.details || {};
          if (log.projectId && (!details.name && !details.projectName)) {
            const project = await tenantDb.project.findUnique({
              where: { id: log.projectId },
              select: { name: true }
            });
            if (project) {
              details.name = project.name;
            }
          }

          // 4. Upsert into MAIN DB
          // We use the same ID from tenant DB to prevent duplicates
          await prisma.activityLog.upsert({
            where: { id: log.id },
            update: {
                details: details,
                projectId: log.projectId,
                action: log.action,
                entity: log.entity,
                entityId: log.entityId,
                userId: log.userId,
                organizationId: log.organizationId,
                createdAt: log.createdAt
            },
            create: {
              id: log.id,
              userId: log.userId,
              organizationId: log.organizationId,
              action: log.action,
              entity: log.entity,
              entityId: log.entityId,
              details: details,
              projectId: log.projectId,
              createdAt: log.createdAt
            }
          });
          createdCount++;
        } catch (syncErr) {
          console.error(`❌ Failed to sync log ${log.id}:`, syncErr.message);
        }
      }
      console.log(`✅ Synced ${createdCount} logs (${skippedCount} already existed/skipped) for ${org.name}`);
    }

    console.log('\n✨ Audit Log Synchronization Complete.');
  } catch (error) {
    console.error('💥 Critical error during sync:', error);
  } finally {
    await prisma.$disconnect();
    await tenantDbManager.disconnectAll();
  }
}

syncAuditLogs();
