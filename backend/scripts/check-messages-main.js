import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.chatMessage.count();
  console.log('Total Chat Messages in Main DB:', count);
  if (count > 0) {
    const last5 = await prisma.chatMessage.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });
    console.log('Last 5 messages:', JSON.stringify(last5, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
