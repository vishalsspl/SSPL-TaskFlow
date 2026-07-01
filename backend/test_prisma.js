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
  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
  
  if (users.length === 0) return;
  const user = users.find(u => u.name.includes('Vishal')) || users.find(u => u.role === 'MEMBER') || users[0];
  
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    select: {
      name: true,
      _count: {
        select: {
          tasks: true,
        }
      },
      filtered_count: {
        select: {
          tasks: { where: { assignees: { some: { userId: user.id } } } }
        }
      }
    }
  });
  console.log('Tasks counts:', JSON.stringify(projects, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
