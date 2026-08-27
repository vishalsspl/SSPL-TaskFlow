import { PrismaClient } from '@prisma/client';
import { sendProjectManagerEmail } from './src/services/emailService.js';

const prisma = new PrismaClient();

async function test() {
  console.log('Connecting to DB...');
  const db = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TENANT_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/taskflow_tenant_vishal?schema=public'
      }
    }
  });

  try {
    const manager = await db.user.findFirst();
    if (!manager) {
      console.log('No manager found');
      return;
    }

    const orgId = manager.organizationId;
    console.log(`Using organizationId: ${orgId} and manager ${manager.email}`);

    const project = await db.project.create({
      data: {
        organizationId: orgId,
        name: `Test Project ${Date.now()}`,
        description: 'Testing',
        startDate: new Date(),
        endDate: new Date(),
        totalBudget: 1000,
        managers: { connect: [{ id: manager.id }] },
        status: 'PLANNING',
        category: 'INTERNAL',
      },
      select: {
        id: true,
        name: true,
        managers: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    console.log('Project created:', JSON.stringify(project, null, 2));
    
    for (const m of project.managers) {
      console.log('Manager email:', m.email);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
    await prisma.$disconnect();
  }
}

test();
