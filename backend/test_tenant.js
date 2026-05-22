const { PrismaClient } = require('./generated/tenant-client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TENANT_DATABASE_URL || 'postgresql://postgres:root@localhost:5432/taskflow_tenant_vishal_demo' // Adjust URL if needed
      }
    }
  });
  
  // Just find all projects
  const projects = await prisma.project.findMany({
    select: { name: true, allowMemberTaskCreation: true }
  });
  
  console.log(projects);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
