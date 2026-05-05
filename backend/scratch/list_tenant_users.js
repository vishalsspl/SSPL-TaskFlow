import { PrismaClient } from '../generated/tenant-client/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function listUsers() {
  const tenantDb = new PrismaClient({
    datasources: { db: { url: process.env.TENANT_DATABASE_URL } }
  });

  try {
    const users = await tenantDb.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('--- Tenant Users ---');
    users.forEach(u => console.log(`${u.id} | ${u.name} | ${u.email} | ${u.role}`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await tenantDb.$disconnect();
  }
}

listUsers();
