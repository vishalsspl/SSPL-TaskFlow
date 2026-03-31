import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const { Client } = pg;

async function provisionTenantDb() {
  const args = process.argv.slice(2);
  const orgIdArg = args.find((a) => a.startsWith('--orgId='));

  if (!orgIdArg) {
    console.error('Usage: node provision-tenant-db.js --orgId=<id>');
    process.exit(1);
  }

  const orgId = orgIdArg.split('=')[1];
  
  // Generate unique DB name valid for PostgreSQL (letters, numbers, underscores)
  const escapedOrgId = orgId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const dbName = `org_${escapedOrgId}`;

  console.log(`\n🚀 Provisioning dedicated database '${dbName}' for Organization ${orgId}...\n`);

  try {
    // 1. Verify organization exists
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error(`Organization ${orgId} not found.`);
    }
    if (org.dbStrategy === 'DEDICATED') {
      console.warn(`⚠️ Organization ${orgId} is already set to DEDICATED (URL: ${org.dbUrl})`);
    }

    // 2. Parse main DB URL to get credentials for PostgreSQL client
    const mainDbUrl = process.env.DATABASE_URL;
    if (!mainDbUrl) throw new Error('DATABASE_URL not found in .env');

    const pgClient = new Client({ connectionString: mainDbUrl });
    await pgClient.connect();

    // 3. Create the new database
    console.log(`⏳ Creating PostgreSQL database: ${dbName}...`);
    // Check if db exists
    const dbExists = await pgClient.query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
    if (dbExists.rowCount === 0) {
      await pgClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created successfully.`);
    } else {
      console.log(`ℹ️ Database ${dbName} already exists. Skipping creation.`);
    }
    await pgClient.end();

    // 4. Construct the new DB URL
    const urlParts = new URL(mainDbUrl);
    urlParts.pathname = `/${dbName}`;
    const tenantDbUrl = urlParts.toString();

    // 5. Run Prisma Migrations on the new database
    console.log(`\n⏳ Running Prisma migrations on ${dbName}...`);
    execSync(`npx prisma migrate deploy`, {
      env: { ...process.env, DATABASE_URL: tenantDbUrl },
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Migrations applied successfully.\n');

    // 6. Update Organization record
    console.log(`⏳ Updating Organization ${orgId} with new DB strategy...`);
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        dbStrategy: 'DEDICATED',
        dbUrl: tenantDbUrl,
      },
    });

    console.log(`🎉 Success! Organization ${org.name} is now using a dedicated database.`);
  } catch (error) {
    console.error('\n❌ Error provisioning tenant DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

provisionTenantDb();
