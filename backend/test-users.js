import { PrismaClient } from './generated/tenant-client/index.js';
const db = new PrismaClient();
async function main() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        customRoles: { select: { id: true, name: true, permissions: true } }
      }
    });
    console.log("Success:", users);
  } catch (e) {
    console.error("Prisma error:", e);
  } finally {
    db.$disconnect();
  }
}
main();
