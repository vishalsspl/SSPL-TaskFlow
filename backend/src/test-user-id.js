import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: '1976cf7e-a4bf-4184-9da7-401d889634a6' },
    include: { organization: true }
  });

  if (!user) {
    console.log('User 1976cf7e not found in MAIN DB');
    return;
  }

  console.log('--- USER DATA ---');
  console.log(`ID: ${user.id}`);
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Org: ${user.organization?.name || 'NULL'}`);
  console.log(`Org ID: ${user.organizationId || 'NULL'}`);
  console.log(`Role: ${user.role}`);
}

main().finally(() => prisma.$disconnect());
