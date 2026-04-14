import prisma from '../src/lib/prisma.js';
import crypto from 'crypto';

async function simulateSignup() {
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
    if (!admin) {
      console.log('No SuperAdmin found.');
      return;
    }

    console.log('Simulating notification for:', admin.email);

    await prisma.$executeRaw`
      INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link", "isRead", "createdAt")
      VALUES (${crypto.randomUUID()}, ${admin.id}, 'Test Timezone Fix', 'Vercel has just signed up.', 'NEW_ORG_SIGNUP', '/superadmin/orgs', false, timezone('utc', now()))
    `;
    
    const latest = await prisma.$queryRaw`SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 1`;
    console.log('New Notification Saved At (UTC):', latest[0].createdAt);
    console.log('Current JS UTC Time:', new Date().toISOString());
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulateSignup();
