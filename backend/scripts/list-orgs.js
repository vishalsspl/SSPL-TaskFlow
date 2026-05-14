import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log('Orgs:', JSON.stringify(orgs.map(o => ({ id: o.id, name: o.name, dbUrl: o.dbUrl })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
