import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '17674cf9-9aab-470b-98d9-b65820a3436e' }
  });
  console.log('Org Details:', JSON.stringify(org, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
