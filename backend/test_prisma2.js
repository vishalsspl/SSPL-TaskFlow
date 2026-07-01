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
  const result = await prisma.project.findMany({ 
    select: { 
      name: true, 
      _count: { 
        select: { 
          tasks: { 
            where: { 
              assignees: { some: { userId: 'fake_id' } } 
            } 
          } 
        } 
      } 
    } 
  });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
