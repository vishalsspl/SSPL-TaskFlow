const { PrismaClient } = require('./generated/tenant-client/index.js');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.TENANT_DATABASE_URL } } });
async function migrate() {
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_UserCustomRoles" ("A", "B")
      SELECT "customRoleId", "id" FROM "User"
      WHERE "customRoleId" IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Successfully copied data.');
  } catch (e) {
    console.error('❌ Failed to copy data:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
migrate();
