import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const orgs = await prisma.organization.findMany({
    where: { name: 'ZS' }
  });
  console.log(JSON.stringify(orgs, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
