import { PrismaClient } from '../generated/tenant-client/index.js';

async function main() {
  const dbUrl = "postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448";
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    const project = await prisma.project.findFirst({
      where: { name: 'BulaLove' },
      include: { manager: true }
    });
    console.log('Project:', project.name);
    console.log('Manager:', project.manager?.name || 'NONE');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
