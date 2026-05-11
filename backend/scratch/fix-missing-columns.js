import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DATABASE SCHEMA SYNC ---');
  
  try {
    // 1. Get all organizations with dedicated databases
    const orgs = await prisma.organization.findMany({
      where: {
        dbUrl: { not: null },
        dbStrategy: 'DEDICATED'
      },
      select: { id: true, name: true, dbUrl: true }
    });

    console.log(`Found ${orgs.length} organizations to update.`);

    for (const org of orgs) {
      console.log(`\nUpdating Organization: ${org.name} (${org.id})`);
      const tenantClient = new PrismaClient({
        datasources: { db: { url: org.dbUrl } }
      });

      try {
        await tenantClient.$connect();
        
        // Add missing columns if they don't exist
        // PostgreSQL doesn't support IF NOT EXISTS for ADD COLUMN in older versions, 
        // so we use a check.
        await tenantClient.$executeRawUnsafe(`
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='githubRepo') THEN
              ALTER TABLE "Project" ADD COLUMN "githubRepo" TEXT;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='githubInstallationId') THEN
              ALTER TABLE "Project" ADD COLUMN "githubInstallationId" TEXT;
            END IF;
          END $$;
        `);
        
        console.log(`✅ ${org.name} updated successfully.`);
      } catch (err) {
        console.error(`❌ Failed to update ${org.name}:`, err.message);
      } finally {
        await tenantClient.$disconnect();
      }
    }

    console.log('\n--- SCHEMA SYNC COMPLETE ---');
  } catch (err) {
    console.error('CRITICAL ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
