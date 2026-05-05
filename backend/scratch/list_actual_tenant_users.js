import { PrismaClient } from '../generated/tenant-client/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function listTenantUsers(dbUrl) {
  const tenantDb = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    const users = await tenantDb.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('--- Tenant Users (org_a28c...) ---');
    users.forEach(u => console.log(`${u.id} | ${u.name} | ${u.email} | ${u.role}`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await tenantDb.$disconnect();
  }
}

listTenantUsers('postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448');
