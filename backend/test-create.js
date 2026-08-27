import { PrismaClient } from './generated/tenant-client/index.js';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TENANT_DATABASE_URL
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) {
    console.log("No users found");
    return;
  }
  const userId = users[0].id;
  
  // mock req object
  const req = {
    db: prisma,
    user: { id: userId, organizationId: "test-org-id" }
  };
  
  const project = await req.db.project.create({
    data: {
      name: "Test Project With Task",
      organizationId: "test-org-id",
      status: "PLANNING",
      phases: {
        create: [
          { name: 'Planning', order: 1 },
          { name: 'Execution', order: 2 }
        ]
      }
    }
  });
  
  const createdPhases = await req.db.phase.findMany({
    where: { projectId: project.id },
    orderBy: { order: 'asc' }
  });

  if (createdPhases.length > 0) {
    const prefix = project.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    await req.db.task.create({
      data: {
        projectId: project.id,
        phaseId: createdPhases[0].id,
        title: 'Project Setup & Planning',
        description: 'Initial project setup and planning activities.',
        status: 'TODO',
        priority: 'MEDIUM',
        type: 'TASK',
        taskNumber: 1,
        shortId: `${prefix}-1`,
        assignees: undefined
      }
    });
  }
  
  const tasks = await req.db.task.findMany({ where: { projectId: project.id } });
  console.log("Created tasks:", tasks.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
