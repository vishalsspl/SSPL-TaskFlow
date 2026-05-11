import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, organizationId: true }
    });

    console.log(JSON.stringify(users, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
