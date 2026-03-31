import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      role: true,
      clientProjects: {
        select: {
          manager: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

test().catch(console.error).finally(() => prisma.$disconnect());
