import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      dbUrl: { not: null },
      dbStrategy: 'DEDICATED'
    }
  });

  console.log(`Found ${orgs.length} dedicated tenant databases.`);

  const schemaPath = path.resolve('prisma/tenant/schema.prisma');

  for (const org of orgs) {
    console.log(`\nSyncing schema for: ${org.name} (${org.id})`);
    console.log(`URL: ${org.dbUrl}`);
    
    try {
      // Set DATABASE_URL and run db push
      execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss`, {
        env: { ...process.env, TENANT_DATABASE_URL: org.dbUrl, DATABASE_URL: org.dbUrl },
        stdio: 'inherit'
      });
      console.log(`Successfully synced ${org.name}`);
    } catch (err) {
      console.error(`Failed to sync ${org.name}:`, err.message);
    }
  }

  // Also sync the shared tenant DB
  console.log(`\nSyncing shared tenant database...`);
  try {
    execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss`, {
      env: { ...process.env },
      stdio: 'inherit'
    });
    console.log(`Successfully synced shared tenant DB`);
  } catch (err) {
    console.error(`Failed to sync shared tenant DB:`, err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
