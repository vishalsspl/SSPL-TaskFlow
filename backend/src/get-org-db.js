import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '8a69af9a-339c-492e-869e-aa48e8726aba' }
  });

  if (!org) {
    console.log('Org SSPL not found');
    return;
  }

  console.log(`DB URL: ${org.dbUrl}`);
}

main().finally(() => prisma.$disconnect());
