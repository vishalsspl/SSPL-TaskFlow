import { PrismaClient } from './generated/tenant-client/index.js';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TENANT_DATABASE_URL
    }
  }
});

async function main() {
  const projects = await prisma.project.findMany({
    include: { tasks: true, phases: true, managers: true }
  });
  console.log(JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
