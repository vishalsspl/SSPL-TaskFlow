import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Dipali', mode: 'insensitive' } },
    include: { organization: true }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User found:', user.name, 'ID:', user.id, 'Org ID:', user.organizationId, 'Org Name:', user.organization?.name);
  
  if (user.organizationId) {
     // Now let's check the tenant DB if we can, but I need to know the dbUrl
     console.log('Org DbUrl:', user.organization?.dbUrl);
  }
}

main().finally(() => prisma.$disconnect());
