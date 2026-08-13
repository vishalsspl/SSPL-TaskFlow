import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const org = await prisma.organization.findUnique({where: {id: '17674cf9-9aab-470b-98d9-b65820a3436e'}});
  console.log('dbUrl is:', org?.dbUrl);
  await prisma.$disconnect();
}
run();
