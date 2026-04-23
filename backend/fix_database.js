/**
 * Emergency Database Fix Script - Phase 2
 * 
 * 1. Find tenant databases on the PostgreSQL server
 * 2. Restore the Organization.dbUrl link
 * 3. Add GitHub columns to the tenant database's Project table
 * 4. Create Integration table in main DB
 */

import pg from 'pg';
const { Client } = pg;

const MAIN_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/taskflow';

async function fixDatabase() {
  const mainClient = new Client({ connectionString: MAIN_DB_URL });
  
  try {
    await mainClient.connect();
    console.log('✅ Connected to main database');

    // Step 1: Create Integration table in main DB
    console.log('\n--- Step 1: Creating Integration table ---');
    await mainClient.query(`
      CREATE TABLE IF NOT EXISTS "Integration" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "organizationId" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3),
        "config" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Integration_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await mainClient.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Integration_organizationId_provider_key'
        ) THEN
          ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_provider_key" UNIQUE ("organizationId", "provider");
        END IF;
      END $$;
    `);
    console.log('✅ Integration table ready');

    // Step 2: Find all organizations
    console.log('\n--- Step 2: Finding organizations ---');
    const orgs = await mainClient.query(`SELECT "id", "name", "dbUrl", "dbStrategy" FROM "Organization"`);
    console.log(`Found ${orgs.rows.length} organization(s):`);
    orgs.rows.forEach(org => {
      console.log(`  - ${org.name} (id: ${org.id}, dbUrl: ${org.dbUrl || 'NULL'}, strategy: ${org.dbStrategy || 'NULL'})`);
    });

    // Step 3: Find tenant databases
    console.log('\n--- Step 3: Finding tenant databases ---');
    const dbs = await mainClient.query(`SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`);
    console.log('Available databases:');
    dbs.rows.forEach(db => console.log(`  - ${db.datname}`));

    // Look for tenant databases (usually named like tenant_<orgId> or taskflow_<orgname>)
    const tenantDbs = dbs.rows.filter(db => 
      db.datname !== 'taskflow' && 
      db.datname !== 'postgres' && 
      db.datname !== 'template0' && 
      db.datname !== 'template1' &&
      (db.datname.startsWith('tenant_') || db.datname.startsWith('taskflow_') || db.datname.includes('org'))
    );

    if (tenantDbs.length > 0) {
      console.log('\nPotential tenant databases found:');
      tenantDbs.forEach(db => console.log(`  🔍 ${db.datname}`));
    }

    // Step 4: Try to restore dbUrl for each org
    console.log('\n--- Step 4: Restoring tenant DB connections ---');
    for (const org of orgs.rows) {
      if (org.dbUrl) {
        console.log(`  ✅ ${org.name} already has dbUrl: ${org.dbUrl}`);
        // Connect to tenant DB and add GitHub columns
        await addGitHubColumnsToTenant(org.dbUrl, org.name);
        continue;
      }

      // Try to find the tenant DB for this org
      const possibleNames = [
        `tenant_${org.id}`,
        `tenant_${org.id.replace(/-/g, '_')}`,
        `taskflow_${org.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      ];

      let foundDbName = null;
      for (const name of possibleNames) {
        const match = dbs.rows.find(db => db.datname === name);
        if (match) {
          foundDbName = match.datname;
          break;
        }
      }

      // Also check any tenant_ prefixed DB
      if (!foundDbName) {
        const anyTenant = dbs.rows.find(db => db.datname.startsWith('tenant_'));
        if (anyTenant) foundDbName = anyTenant.datname;
      }

      if (foundDbName) {
        const tenantUrl = `postgresql://postgres:password@localhost:5432/${foundDbName}`;
        console.log(`  🔗 Restoring ${org.name} -> ${foundDbName}`);
        await mainClient.query(
          `UPDATE "Organization" SET "dbUrl" = $1, "dbStrategy" = 'DEDICATED' WHERE "id" = $2`,
          [tenantUrl, org.id]
        );
        console.log(`  ✅ dbUrl restored for ${org.name}`);
        await addGitHubColumnsToTenant(tenantUrl, org.name);
      } else {
        console.log(`  ⚠️  No tenant DB found for ${org.name}. Setting dbUrl to NULL (will use main DB fallback)`);
      }
    }

    console.log('\n🎉 Database fix complete!');
    console.log('\nNext steps:');
    console.log('1. Stop your server: taskkill /F /IM node.exe');
    console.log('2. Regenerate clients: npm run db:generate:all');
    console.log('3. Start server: npm run dev');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mainClient.end();
  }
}

async function addGitHubColumnsToTenant(dbUrl, orgName) {
  const tenantClient = new Client({ connectionString: dbUrl });
  try {
    await tenantClient.connect();
    
    // Check if Project table exists in this DB
    const tableCheck = await tenantClient.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'Project' LIMIT 1
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log(`    ⚠️  No Project table in tenant DB for ${orgName}`);
      return;
    }

    await tenantClient.query(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubRepo" TEXT`);
    await tenantClient.query(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubInstallationId" TEXT`);
    console.log(`    ✅ GitHub columns added to Project table for ${orgName}`);
  } catch (err) {
    console.error(`    ❌ Failed to update tenant DB for ${orgName}:`, err.message);
  } finally {
    await tenantClient.end();
  }
}

fixDatabase();
