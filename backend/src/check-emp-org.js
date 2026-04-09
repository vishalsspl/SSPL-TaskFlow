import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['emp1@gmail.com', 'emp2@gmail.com'] } }
  });

  console.log('--- EMP USERS ---');
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`Org ID: ${u.organizationId}`);
  });
}

main().finally(() => prisma.$disconnect());
