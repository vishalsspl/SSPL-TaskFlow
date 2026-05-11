import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: { organization: true }
    });

    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.role}) - Org: ${u.organization?.name || 'NONE'}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
