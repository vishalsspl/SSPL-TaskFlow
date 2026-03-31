import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Vikrant', mode: 'insensitive' } },
    include: {
      taskAssignments: {
        include: {
          task: true
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', { id: user.id, email: user.email, name: user.name, role: user.role });
  console.log('Assigned tasks count:', user.taskAssignments.length);
  if (user.taskAssignments.length > 0) {
    console.log('Example assigned task:', JSON.stringify(user.taskAssignments[0].task, null, 2));
    console.log('Complete Task Sample:', JSON.stringify(user.taskAssignments[0], null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
