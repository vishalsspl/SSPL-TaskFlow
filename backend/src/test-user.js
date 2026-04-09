import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Vishal', mode: 'insensitive' } },
    include: { organization: true }
  });

  console.log('--- FOUND USERS ---');
  users.forEach(u => {
    console.log(`ID: ${u.id}`);
    console.log(`Name: ${u.name}`);
    console.log(`Email: ${u.email}`);
    console.log(`Org: ${u.organization?.name || 'NULL'}`);
    console.log(`Org ID: ${u.organizationId || 'NULL'}`);
    console.log(`Role: ${u.role}`);
    console.log('---');
  });
}

main().finally(() => prisma.$disconnect());
