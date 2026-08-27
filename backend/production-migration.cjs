const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('--- STARTING SAFE PRODUCTION MIGRATION ---');
  
  const schemaPath = path.join(__dirname, 'prisma', 'tenant', 'schema.prisma');
  let originalSchema = fs.readFileSync(schemaPath, 'utf8');
  
  console.log('1. Adding intermediate customRoleId to schema.prisma...');
  let intermediateSchema = originalSchema.replace(
    '  customRoles    CustomRole[]  @relation("UserCustomRoles")',
    '  customRoleId   String?\n  customRole     CustomRole?   @relation("UserCustomRole", fields: [customRoleId], references: [id], onDelete: SetNull)\n  customRoles    CustomRole[]  @relation("UserCustomRoles")'
  );
  
  fs.writeFileSync(schemaPath, intermediateSchema);
  
  console.log('2. Pushing intermediate schema to all tenants to create _UserCustomRoles table...');
  try {
    execSync('node scripts/migrate-all-tenants.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to push intermediate schema:', e.message);
  }

  console.log('3. Running data migration for all dedicated tenant databases...');
  const mainPrisma = new PrismaClient();
  try {
    const orgs = await mainPrisma.organization.findMany({
      where: { dbUrl: { not: null }, dbStrategy: 'DEDICATED' }
    });
    
    for (const org of orgs) {
      console.log(`Copying data for tenant: ${org.name}...`);
      const script = `
        const { PrismaClient } = require('./generated/tenant-client/index.js');
        const prisma = new PrismaClient({ datasources: { db: { url: process.env.TENANT_DATABASE_URL } } });
        async function migrate() {
          try {
            await prisma.$executeRawUnsafe(\`
              INSERT INTO "_UserCustomRoles" ("A", "B")
              SELECT "customRoleId", "id" FROM "User"
              WHERE "customRoleId" IS NOT NULL
              ON CONFLICT DO NOTHING;
            \`);
            console.log('✅ Successfully copied data.');
          } catch (e) {
            console.error('❌ Failed to copy data:', e.message);
          } finally {
            await prisma.$disconnect();
          }
        }
        migrate();
      `;
      
      try {
        execSync(`node -e "${script.replace(/"/g, '\\"')}"`, {
          env: { ...process.env, TENANT_DATABASE_URL: org.dbUrl },
          stdio: 'inherit'
        });
      } catch (err) {}
    }
  } catch (err) {
    console.error('Error fetching orgs:', err);
  } finally {
    await mainPrisma.$disconnect();
  }

  console.log('4. Restoring final schema.prisma (dropping customRoleId)...');
  fs.writeFileSync(schemaPath, originalSchema);
  
  console.log('5. Pushing final schema to drop the old column...');
  try {
    execSync('node scripts/migrate-all-tenants.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to push final schema:', e.message);
  }

  console.log('6. Generating Prisma Client...');
  try {
    execSync('npm run db:generate:tenant', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to generate client:', e.message);
  }
  
  console.log('--- MIGRATION COMPLETE! PLEASE RESTART YOUR NODE SERVER ---');
}

main();
