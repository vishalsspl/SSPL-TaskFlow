import { PrismaClient } from '../generated/tenant-client/index.js';

async function main() {
  const dbUrl = "postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448";
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    console.log('--- Checking SSPL Tenant DB ---');
    const users = await prisma.user.findMany();
    console.log('Users in tenant DB:', users.length);
    users.forEach(u => console.log(`- ${u.name} (${u.role}) - ${u.email}`));

    const projects = await prisma.project.findMany();
    console.log('\nProjects in tenant DB:', projects.length);
    projects.forEach(p => console.log(`- ${p.name} (Status: ${p.status}, OrgId: ${p.organizationId})`));

    const tasks = await prisma.task.findMany({
      include: { project: true }
    });
    console.log('\nTasks in tenant DB:', tasks.length);
    tasks.forEach(t => console.log(`- ${t.title} (Project: ${t.project.name}, Status: ${t.status})`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
