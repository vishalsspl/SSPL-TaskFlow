import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ where: { dbUrl: { not: null } } });

  for (const org of orgs) {
    console.log(`Checking DM IDs in ${org.name}...`);
    const tenantDb = new (await import('../generated/tenant-client/index.js')).PrismaClient({
      datasources: { db: { url: org.dbUrl } }
    });

    const dmMsgs = await tenantDb.chatMessage.findMany({
      where: { projectId: { startsWith: 'dm_' } }
    });

    for (const msg of dmMsgs) {
      const parts = msg.projectId.replace('dm_', '').split('_');
      if (parts.length === 2) {
        const normalized = `dm_${parts.sort().join('_')}`;
        if (normalized !== msg.projectId) {
          console.log(`Normalizing ${msg.projectId} -> ${normalized}`);
          await tenantDb.chatMessage.update({
            where: { id: msg.id },
            data: { projectId: normalized }
          });
          
          // Also update LastSeen
          await tenantDb.chatRoomLastSeen.updateMany({
            where: { projectId: msg.projectId },
            data: { projectId: normalized }
          });
        }
      }
    }
    await tenantDb.$disconnect();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
