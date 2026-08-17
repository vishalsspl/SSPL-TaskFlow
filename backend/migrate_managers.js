import { PrismaClient } from './generated/tenant-client/index.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TENANT_DATABASE_URL
    }
  }
});

async function main() {
  console.log("Starting manager migration...");
  
  // A refers to Project (P < U alphabetically)
  // B refers to User
  
  try {
    const result = await prisma.$executeRaw`
      INSERT INTO "_ProjectManagers" ("A", "B")
      SELECT "id", "managerId"
      FROM "Project"
      WHERE "managerId" IS NOT NULL
      ON CONFLICT DO NOTHING;
    `;
    console.log(`Migration successful. Rows affected: ${result}`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
