import { PrismaClient } from '@prisma/client';

async function main() {
  const dbUrl = 'postgresql://postgres:password@localhost:5432/org_b2a4787e36a24060a0a2b16ec765bdd4';
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    }
  });

  try {
    const user = await tenantPrisma.user.findUnique({
      where: { email: 'vishalr@sveltoz.com' }
    });

    if (user) {
      console.log('✅ PASS: Vishal exists in Tenant DB');
      console.log(`ID: ${user.id}`);
    } else {
      console.log('❌ FAIL: Vishal NOT FOUND in Tenant DB');
    }
  } catch (err) {
    console.error('Failed to query tenant DB:', err.message);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

main();
