import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = '8a69af9a-339c-492e-869e-aa48e8726aba';
  const users = await prisma.user.findMany({
    where: { organizationId: orgId }
  });

  console.log(`Found ${users.length} users for Org ${orgId}`);
  users.forEach(u => console.log(`- ${u.name} (${u.email})`));
}

main().finally(() => prisma.$disconnect());
