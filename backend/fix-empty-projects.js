import { PrismaClient } from './generated/tenant-client/index.js';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TENANT_DATABASE_URL
    }
  }
});

async function main() {
  console.log("Checking for projects with 0 tasks...");
  const projects = await prisma.project.findMany({
    include: {
      tasks: true,
      phases: { orderBy: { order: 'asc' } },
      managers: true
    }
  });

  let fixedCount = 0;

  for (const project of projects) {
    if (project.tasks.length === 0) {
      console.log(`Fixing project: ${project.name} (ID: ${project.id})`);
      
      if (project.phases.length === 0) {
        console.log(`  - No phases found for this project, skipping.`);
        continue;
      }

      const prefix = project.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
      
      const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' }, take: 1 });
      const assignedById = adminUsers.length > 0 ? adminUsers[0].id : undefined;

      await prisma.task.create({
        data: {
          projectId: project.id,
          phaseId: project.phases[0].id,
          title: 'Project Setup & Planning',
          description: 'Initial project setup and planning activities.',
          status: 'TODO',
          priority: 'MEDIUM',
          type: 'TASK',
          taskNumber: 1,
          shortId: `${prefix}-1`,
          assignees: project.managers?.length > 0 && assignedById ? {
            create: project.managers.map(m => ({
              user: { connect: { id: m.id } },
              assignedBy: { connect: { id: assignedById } }
            }))
          } : undefined
        }
      });
      fixedCount++;
      console.log(`  - Created default task for ${project.name}`);
    }
  }

  console.log(`\nFinished! Fixed ${fixedCount} projects.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
