
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProjects() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
      }
    });
    console.log(JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
