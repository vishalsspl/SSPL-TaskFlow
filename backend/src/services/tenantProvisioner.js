/**
 * Tenant Database Provisioning Service
 * 
 * Handles automatic creation of PostgreSQL databases for new tenants:
 * 1. Creates a new PostgreSQL database
 * 2. Runs Prisma migrations on it (using tenant.prisma schema)
 * 3. Seeds initial organization data
 * 4. Returns the dbUrl for storage in the MAIN DB
 */
import pg from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import tenantDbManager from '../lib/tenantDbManager.js';
import prisma from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '../..');

const { Client } = pg;

/**
 * Sanitizes a string for use as a PostgreSQL database name.
 * 
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeDbName(str) {
  if (!str) return 'unnamed';
  
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscores
    .replace(/_+/g, '_')        // Collapse multiple underscores
    .replace(/^_+|_+$/g, '')    // Remove leading/trailing underscores
    .substring(0, 50);          // Truncate to leave room for ID suffix
}

/**
 * Provision a dedicated database for a new organization.
 * 
 * @param {Object} params
 * @param {string} params.orgId - Organization ID
 * @param {string} params.orgName - Organization name (for logging)
 * @param {Object} params.orgData - Full organization data to seed into tenant DB
 * @param {Object} params.adminData - Admin user data to seed into tenant DB
 * @returns {Promise<string>} The tenant database URL
 */
export async function provisionTenantDatabase({ orgId, orgName, orgData, adminData }) {
  // Generate hybrid DB name: org_<sanitized-name>_<short-id>
  const sanitizedName = sanitizeDbName(orgName);
  const shortId = orgId.replace(/-/g, '').substring(0, 8);
  const dbName = `org_${sanitizedName}_${shortId}`;

  console.log(`\n🚀 [TenantProvisioner] Provisioning DB '${dbName}' for "${orgName}"...\n`);

  const mainDbUrl = process.env.DATABASE_URL;
  if (!mainDbUrl) throw new Error('DATABASE_URL not set in environment');

  // 1. Connect to PostgreSQL server using main DB credentials
  const pgClient = new Client({ connectionString: mainDbUrl });
  await pgClient.connect();

  try {
    // 2. Create the database if it doesn't exist
    const dbExists = await pgClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    
    if (dbExists.rowCount === 0) {
      // Use double-quote escaping for the db name to handle special chars
      await pgClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ [TenantProvisioner] Database "${dbName}" created`);
    } else {
      console.log(`ℹ️  [TenantProvisioner] Database "${dbName}" already exists`);
    }
  } finally {
    await pgClient.end();
  }
  
  // 3. Construct the tenant DB URL
  const urlParts = new URL(mainDbUrl);
  urlParts.pathname = `/${dbName}`;
  const tenantDbUrl = urlParts.toString();

  // 4. Run Prisma schema push on the new database using tenant.prisma
  console.log(`⏳ [TenantProvisioner] Pushing tenant schema to "${dbName}"...`);
  try {
    execSync(`npx prisma db push --schema=prisma/tenant/schema.prisma --accept-data-loss --skip-generate`, {
      env: { ...process.env, TENANT_DATABASE_URL: tenantDbUrl },
      stdio: 'inherit',
      cwd: backendRoot,
    });
    console.log(`✅ [TenantProvisioner] Schema pushed to "${dbName}"`);
  } catch (err) {
    console.error(`❌ [TenantProvisioner] Migration failed for "${dbName}":`, err.message);
    // Attempt cleanup: drop the database
    const cleanupClient = new Client({ connectionString: mainDbUrl });
    await cleanupClient.connect();
    try {
      await cleanupClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.log(`🧹 [TenantProvisioner] Cleaned up failed database "${dbName}"`);
    } finally {
      await cleanupClient.end();
    }
    throw new Error(`Failed to apply migrations to tenant database: ${err.message}`);
  }

  // 5. Seed initial data into tenant DB (organization record + admin user)
  if (orgData || adminData) {
    try {
      const tenantClient = await tenantDbManager.getClient(tenantDbUrl);

      // Seed org record in tenant DB for backward-compat filtering
      if (orgData) {
        await tenantClient.organization.upsert({
          where: { id: orgData.id },
          update: orgData,
          create: orgData,
        });
        console.log(`✅ [TenantProvisioner] Seeded organization in tenant DB`);
      }

      // Seed admin user in tenant DB
      if (adminData) {
        await tenantClient.user.upsert({
          where: { id: adminData.id },
          update: adminData,
          create: adminData,
        });
        console.log(`✅ [TenantProvisioner] Seeded admin user in tenant DB`);
      }
    } catch (seedErr) {
      console.error(`⚠️ [TenantProvisioner] Seeding warning for "${dbName}":`, seedErr.message);
      // Don't fail the whole provisioning for seed errors
    }
  }

  console.log(`🎉 [TenantProvisioner] Tenant DB "${dbName}" ready for "${orgName}"\n`);
  return tenantDbUrl;
}

/**
 * Drop a tenant database (for org deletion).
 * 
 * @param {string} orgId - Organization ID
 */
export async function dropTenantDatabase(orgId) {
  const mainDbUrl = process.env.DATABASE_URL;
  if (!mainDbUrl) throw new Error('DATABASE_URL not set');

  let dbName = null;

  try {
    // 1. Try to fetch the actual dbUrl from the Organization table
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { dbUrl: true }
    });

    if (org?.dbUrl) {
      const url = new URL(org.dbUrl);
      dbName = url.pathname.substring(1); // Remove leading slash
      console.log(`🔍 [TenantProvisioner] Found DB name '${dbName}' from stored URL for org '${orgId}'`);
    }
  } catch (err) {
    console.warn(`⚠️ [TenantProvisioner] Failed to lookup org URL, falling back to naming convention:`, err.message);
  }

  // 2. Fallback to calculating the name if lookup failed (for robustness)
  if (!dbName) {
    const escapedOrgId = orgId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    dbName = `org_${escapedOrgId}`;
    console.log(`⚠️ [TenantProvisioner] Falling back to old naming convention for org '${orgId}': ${dbName}`);
  }

  const pgClient = new Client({ connectionString: mainDbUrl });
  await pgClient.connect();

  try {
    // Terminate existing connections to the database
    await pgClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
    `, [dbName]);

    await pgClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`🗑️ [TenantProvisioner] Dropped tenant database "${dbName}"`);
  } finally {
    await pgClient.end();
  }
}

export default { provisionTenantDatabase, dropTenantDatabase };
