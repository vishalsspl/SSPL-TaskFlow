import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    select: { name: true, allowMemberTaskCreation: true }
  });
  console.log(projects);
}
main().catch(console.error).finally(() => prisma.$disconnect());
