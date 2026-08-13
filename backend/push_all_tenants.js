import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

async function pushSchemaToAllTenants() {
  const orgs = await prisma.organization.findMany({
    where: { dbStrategy: 'DEDICATED' },
    select: { id: true, name: true, dbUrl: true }
  });

  console.log(`Found ${orgs.length} dedicated tenant databases.`);

  for (const org of orgs) {
    if (!org.dbUrl) continue;
    console.log(`\nPushing schema to ${org.name} (${org.id})...`);
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push --schema=prisma/tenant/schema.prisma --skip-generate', {
        env: { ...process.env, TENANT_DATABASE_URL: org.dbUrl }
      });
      console.log(stdout);
    } catch (err) {
      console.error(`Error pushing to ${org.name}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

pushSchemaToAllTenants();
