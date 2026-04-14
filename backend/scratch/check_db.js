import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const notifications = await prisma.$queryRaw`SELECT * FROM "Notification"`;
    console.log('Notifications in DB:', notifications);
    
    const superAdmins = await prisma.user.findMany({ where: { role: 'SUPERADMIN' } });
    console.log('SuperAdmins in DB:', superAdmins.map(u => u.email));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
