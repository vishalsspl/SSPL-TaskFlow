const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function migrateData() {
  const mainPrisma = new PrismaClient();
  try {
    const orgs = await mainPrisma.organization.findMany({
      where: { dbUrl: { not: null } }
    });
    
    console.log(`Found ${orgs.length} tenant databases to migrate.`);
    
    for (const org of orgs) {
      console.log(`Migrating customRoleId for: ${org.name}...`);
      
      try {
        execSync(`node run-tenant-migration.cjs`, {
          env: { ...process.env, TENANT_DATABASE_URL: org.dbUrl },
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch (err) {}
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mainPrisma.$disconnect();
  }
}

migrateData();
