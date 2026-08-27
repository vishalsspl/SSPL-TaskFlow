const { PrismaClient } = require('./backend/generated/tenant-client/index.js');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    include: { tasks: true, managers: true }
  });
  console.log(JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
