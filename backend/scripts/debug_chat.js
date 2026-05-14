import { PrismaClient } from '../generated/tenant-client/index.js';
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
  try {
    const projects = await prisma.project.findMany({
      select: { id: true, name: true }
    });

    console.log('Total Projects in DB:', projects.length);
    projects.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));

    const messages = await prisma.chatMessage.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { projectId: true, content: true }
    });

    console.log('\nRecent Messages:');
    messages.forEach(m => console.log(`- Room: ${m.projectId}, Content: ${m.content.substring(0, 20)}`));

  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
