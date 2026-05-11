import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { name: { contains: 'Patil', mode: 'insensitive' } },
      include: { organization: true }
    });

    if (!user) {
      console.log('User "Patil" not found');
      return;
    }

    console.log('User found:', user.name, 'ID:', user.id, 'Org ID:', user.organizationId, 'Org Name:', user.organization?.name);
    
    if (user.organizationId) {
       console.log('Org DbUrl:', user.organization?.dbUrl);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
