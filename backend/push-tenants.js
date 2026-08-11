import { PrismaClient as MainPrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

async function pushSchemaToAllTenants() {
  const mainPrisma = new MainPrismaClient();
  const orgs = await mainPrisma.organization.findMany({
    where: { dbStrategy: 'DEDICATED', dbUrl: { not: null } },
  });

  console.log(`Found ${orgs.length} tenant organizations.`);

  for (const org of orgs) {
    console.log(`Pushing schema to ${org.name}...`);
    try {
      execSync('npx prisma db push --schema=prisma/tenant/schema.prisma --accept-data-loss', {
        env: { ...process.env, TENANT_DATABASE_URL: org.dbUrl },
        stdio: 'inherit'
      });
      console.log(`Successfully pushed to ${org.name}`);
    } catch (e) {
      console.error(`Failed to push schema for ${org.name}:`, e.message);
    }
  }

  await mainPrisma.$disconnect();
}

pushSchemaToAllTenants().catch(console.error);
