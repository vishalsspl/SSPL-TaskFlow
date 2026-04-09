import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'SSPL', mode: 'insensitive' } }
  });

  if (!org) {
    console.log('Organization SSPL not found');
    return;
  }

  console.log(`Checking messages for Org: ${org.name} (${org.id})`);
  console.log(`DB URL: ${org.dbUrl}`);

  // Since it's a dedicated DB, we need to connect to it.
  // For the sake of this test, I'll try to find any chat messages in the main DB first 
  // (in case it fell back to main DB)
  const mainMessages = await prisma.chatMessage?.findMany({
    where: { organizationId: org.id }
  }).catch(() => []);

  console.log(`Messages in Main DB: ${mainMessages.length}`);
  if (mainMessages.length > 0) {
    console.table(mainMessages.map(m => ({ id: m.id, content: m.content.substring(0, 20), userId: m.userId })));
  }
}

main().finally(() => prisma.$disconnect());
