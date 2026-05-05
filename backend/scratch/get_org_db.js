import prisma from '../src/lib/prisma.js';

async function getOrgDb(orgId) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { dbUrl: true, dbStrategy: true }
    });
    console.log('Org ID:', orgId);
    console.log('DB URL:', org.dbUrl);
    console.log('Strategy:', org.dbStrategy);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

getOrgDb('17674cf9-9aab-470b-98d9-b65820a3436e');
