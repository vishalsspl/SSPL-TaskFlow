import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, dbUrl: true }
    });
    console.log('--- ALL ORGANIZATIONS ---');
    orgs.forEach(o => {
      console.log(`ID: ${o.id} | Name: ${o.name} | Has DB: ${!!o.dbUrl}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
