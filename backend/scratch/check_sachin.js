import { PrismaClient } from '../generated/tenant-client/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkSachin() {
  const dbUrl = 'postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448';
  const tenantDb = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    const user = await tenantDb.user.findUnique({
      where: { id: '177574c6-ea59-4cb6-8828-cf6ac23e33a9' }
    });
    console.log('User Sachin:', JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await tenantDb.$disconnect();
  }
}

checkSachin();
