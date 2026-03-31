import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true, projects: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(orgs);
  } catch (err) {
    console.error("PRISMA ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
