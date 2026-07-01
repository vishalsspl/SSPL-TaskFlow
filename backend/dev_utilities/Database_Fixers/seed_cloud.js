import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    let projects = await prisma.project.findMany({
      where: { name: { contains: 'Migration' } }
    });

    if (projects.length === 0) {
      console.log('Migration project not found, using the first project.');
      projects = await prisma.project.findMany({ take: 1 });
    }
    
    if (projects.length === 0) {
      console.log('No projects exist.');
      process.exit(0);
    }
    
    const targetProject = projects[0];
    console.log('Found project:', targetProject.name, 'Org:', targetProject.organizationId);

    // clear old tasks
    await prisma.task.deleteMany({
      where: { projectId: targetProject.id }
    });

    const tasksToInsert = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const trends = [
        { assigned: 5, completed: 2 },
        { assigned: 6, completed: 4 },
        { assigned: 8, completed: 5 },
        { assigned: 12, completed: 10 },
        { assigned: 15, completed: 12 },
        { assigned: 10, completed: 12 },
      ];
      
      const trend = trends[5-i];
      const numAssigned = trend.assigned;
      const numCompleted = trend.completed;
      
      const targetMonth = new Date();
      targetMonth.setMonth(now.getMonth() - i);
      targetMonth.setDate(15);
      
      for (let j = 0; j < numAssigned; j++) {
        const isCompleted = j < numCompleted;
        tasksToInsert.push({
          title: `Cloud Setup Phase ${i} Task ${j}`,
          description: 'Auto-generated task for chart rendering',
          status: isCompleted ? 'COMPLETED' : 'TODO',
          priority: 'MEDIUM',
          projectId: targetProject.id,
          createdAt: targetMonth,
          updatedAt: isCompleted ? new Date(targetMonth.getTime() + 86400000) : targetMonth,
          completionPercentage: isCompleted ? 100 : 0,
        });
      }
    }
    
    const res = await prisma.task.createMany({
      data: tasksToInsert
    });
    
    console.log(`Inserted ${res.count} tasks into project ${targetProject.name}.`);
    
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
