import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const projects = await prisma.project.findMany();
    console.log('Projects in MAIN DB:', projects.length);
    projects.forEach(p => console.log(`- ${p.name} (OrgId: ${p.organizationId})`));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
