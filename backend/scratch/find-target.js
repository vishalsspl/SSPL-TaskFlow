import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = "a752d275-0d36-4427-9263-0b020bc8c868";
  const userId = "7aafcc6c-3ab9-4714-b774-332c03858bc3";

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    console.log('Organization:', org);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });
    console.log('User:', user);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
