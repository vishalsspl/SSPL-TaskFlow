import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userId = "7aafcc6c-3ab9-4714-b774-332c03858bc3";
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    console.log('User Found:', !!user);
    if (user) console.log(user);
    
    const count = await prisma.user.count();
    console.log('Total Users:', count);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
