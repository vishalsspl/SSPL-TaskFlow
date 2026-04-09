import { PrismaClient } from '@prisma/client';

async function main() {
  const dbUrl = 'postgresql://postgres:password@localhost:5432/org_b2a4787e36a24060a0a2b16ec765bdd4';
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    }
  });

  try {
    const messages = await tenantPrisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } }
    });

    console.log(`--- RECENT MESSAGES IN TENANT DB ---`);
    if (messages.length === 0) {
      console.log('No messages found.');
    } else {
      messages.forEach(m => {
        console.log(`[${m.createdAt.toISOString()}] ${m.user.name}: ${m.content.substring(0, 50)}`);
      });
    }
  } catch (err) {
    console.error('Failed to query tenant DB:', err.message);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

main();
