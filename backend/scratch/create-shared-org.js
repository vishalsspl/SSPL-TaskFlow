import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const org = await prisma.organization.create({
      data: {
        name: 'Shared Org Test',
        dbStrategy: 'SHARED',
        plan: 'FREE',
        status: 'ACTIVE'
      }
    });

    const user = await prisma.user.create({
      data: {
        name: 'Shared Admin',
        email: 'shared@test.com',
        passwordHash: 'fake',
        role: 'ADMIN',
        organizationId: org.id,
        isApproved: true
      }
    });

    console.log('Created Shared Org:', org.id);
    console.log('Created Shared Admin:', user.id);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
