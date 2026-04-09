import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = '8a69af9a-339c-492e-869e-aa48e8726aba';
  
  console.log('--- MAIN DB USERS ---');
  const mainUsers = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, role: true, isApproved: true }
  });
  console.table(mainUsers);

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (org && org.dbUrl) {
    console.log(`\n--- TENANT DB USERS (${org.dbUrl}) ---`);
    const tenantPrisma = new PrismaClient({ datasources: { db: { url: org.dbUrl } } });
    try {
      const tenantUsers = await tenantPrisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isApproved: true }
      });
      console.table(tenantUsers);
    } catch (err) {
      console.error('Failed to query tenant DB:', err.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
}

main().finally(() => prisma.$disconnect());
