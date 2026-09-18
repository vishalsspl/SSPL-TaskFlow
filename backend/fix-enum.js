import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get ALL organizations with dedicated databases
  const orgs = await prisma.organization.findMany({
    where: { dbStrategy: 'DEDICATED', dbUrl: { not: null } },
    select: { id: true, name: true, dbUrl: true }
  });

  console.log(`Found ${orgs.length} tenant databases to update.`);

  // Also update the default tenant DB
  const defaultTenantUrl = process.env.TENANT_DATABASE_URL;
  const allUrls = new Set(orgs.map(o => o.dbUrl));
  if (defaultTenantUrl) allUrls.add(defaultTenantUrl);

  for (const dbUrl of allUrls) {
    console.log(`\nUpdating: ${dbUrl.replace(/\/\/.*@/, '//***@')}`);
    const { PrismaClient: TenantClient } = await import('./generated/tenant-client/index.js');
    const tenant = new TenantClient({
      datasources: { db: { url: dbUrl } }
    });

    try {
      await tenant.$executeRawUnsafe(`ALTER TYPE "TimeEntryStatus" ADD VALUE IF NOT EXISTS 'DRAFT';`);
      console.log('  ✅ DRAFT added successfully.');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ℹ️  DRAFT already exists, skipping.');
      } else {
        console.error('  ❌ Error:', err.message);
      }
    } finally {
      await tenant.$disconnect();
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
