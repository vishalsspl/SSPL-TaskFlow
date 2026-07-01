import { PrismaClient as MainPrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../../generated/tenant-client/index.js';

const mainPrisma = new MainPrismaClient();

async function backfillTasks(prisma, dbName) {
  try {
    // Find all completed tasks with no completedAt date
    const tasksToUpdate = await prisma.task.findMany({
      where: {
        OR: [
          { status: 'COMPLETED' },
          { completionPercentage: 100 }
        ],
        completedAt: null,
      },
      select: { id: true, updatedAt: true, title: true }
    });

    if (tasksToUpdate.length === 0) {
      console.log(`[${dbName}] No tasks to backfill.`);
      return;
    }

    console.log(`[${dbName}] Found ${tasksToUpdate.length} tasks to backfill. Updating...`);

    let updatedCount = 0;
    for (const task of tasksToUpdate) {
      await prisma.task.update({
        where: { id: task.id },
        data: { completedAt: task.updatedAt }
      });
      updatedCount++;
    }

    console.log(`[${dbName}] Successfully backfilled ${updatedCount} tasks.`);
  } catch (error) {
    console.error(`[${dbName}] Error backfilling tasks:`, error.message);
  }
}

async function main() {
  console.log('--- Starting CompletedAt Backfill Script ---');

  // 1. Backfill Main/Shared Database
  await backfillTasks(mainPrisma, 'MAIN_DB');

  // 2. Find all Dedicated Tenant Databases
  const orgs = await mainPrisma.organization.findMany({
    where: {
      dbUrl: { not: null },
      dbStrategy: 'DEDICATED'
    }
  });

  console.log(`Found ${orgs.length} dedicated tenant databases to check.`);

  // 3. Backfill each Tenant Database
  for (const org of orgs) {
    console.log(`\n--- Processing Tenant: ${org.name} ---`);
    const tenantPrisma = new TenantPrismaClient({
      datasources: { db: { url: org.dbUrl } }
    });

    try {
      await tenantPrisma.$connect();
      await backfillTasks(tenantPrisma, org.name);
    } catch (err) {
      console.error(`Failed to connect to ${org.name}:`, err.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  console.log('\n--- Backfill Complete ---');
}

main()
  .catch(console.error)
  .finally(async () => {
    await mainPrisma.$disconnect();
    process.exit(0);
  });
