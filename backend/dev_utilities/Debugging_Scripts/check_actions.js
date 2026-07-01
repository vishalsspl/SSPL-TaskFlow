const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const actions = await prisma.activityLog.findMany({
      select: { action: true },
      distinct: ['action']
    });
    console.log('---ACTIONS---');
    console.log(JSON.stringify(actions.map(a => a.action)));
    console.log('---END---');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
