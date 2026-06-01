/**
 * Schema Validator Utility
 * 
 * Provides "Lazy Migration" helpers to ensure tenant databases are up-to-date
 * with the latest schema requirements without needing a global migration run.
 */

export const ensureProjectSchema = async (db) => {
  if (!db || !db.$queryRawUnsafe) return;
  
  // 1. Check GitHub columns
  try {
    await db.$queryRawUnsafe('SELECT "githubRepo" FROM "Project" LIMIT 1');
  } catch (err) {
    if (err.message.includes('column "githubRepo" does not exist') || err.message.includes('does not exist')) {
      console.log('[SchemaValidator] Auto-migrating Project table: Adding GitHub columns');
      try {
        await db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubRepo" TEXT');
        await db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubInstallationId" TEXT');
      } catch (migrateErr) {
        console.error('[SchemaValidator] Project migration failed:', migrateErr.message);
      }
    }
  }

  // 2. Check allowMemberTaskCreation column
  try {
    await db.$queryRawUnsafe('SELECT "allowMemberTaskCreation" FROM "Project" LIMIT 1');
  } catch (err) {
    console.log('[SchemaValidator] Auto-migrating Project table: Adding allowMemberTaskCreation column');
    try {
      await db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "allowMemberTaskCreation" BOOLEAN DEFAULT FALSE');
    } catch (migrateErr) {
      console.error('[SchemaValidator] Project allowMemberTaskCreation migration failed:', migrateErr.message);
    }
  }
};

export const ensureChatSchema = async (db) => {
  if (!db || !db.$queryRawUnsafe) return;

  // 1. Check ChatMessage columns
  try {
    await db.$queryRawUnsafe('SELECT "parentId", "reactions", "isForwarded" FROM "ChatMessage" LIMIT 1');
  } catch (err) {
    console.log('[SchemaValidator] Auto-migrating ChatMessage table');
    try {
      await db.$executeRawUnsafe('ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "parentId" TEXT');
      await db.$executeRawUnsafe('ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "reactions" JSONB');
      await db.$executeRawUnsafe('ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isForwarded" BOOLEAN DEFAULT FALSE');
    } catch (migrateErr) {
      console.error('[SchemaValidator] ChatMessage migration failed:', migrateErr.message);
    }
  }

  // 2. Check ChatRoomLastSeen table
  try {
    await db.$queryRawUnsafe('SELECT id FROM "ChatRoomLastSeen" LIMIT 1');
  } catch (err) {
    if (err.message.includes('relation "ChatRoomLastSeen" does not exist') || err.message.includes('does not exist')) {
      console.log('[SchemaValidator] Auto-migrating: Creating ChatRoomLastSeen table');
      try {
        await db.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ChatRoomLastSeen" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "projectId" TEXT,
            "organizationId" TEXT,
            "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ChatRoomLastSeen_pkey" PRIMARY KEY ("id")
          )
        `);
        await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoomLastSeen_userId_projectId_organizationId_key" ON "ChatRoomLastSeen"("userId", "projectId", "organizationId")');
      } catch (migrateErr) {
        console.error('[SchemaValidator] ChatRoomLastSeen creation failed:', migrateErr.message);
      }
    }
  }
};

export const ensureOrganizationSchema = async (db) => {
  if (!db || !db.$queryRawUnsafe) return;
  
  try {
    await db.$queryRawUnsafe('SELECT "customFeatures", "rolePermissions" FROM "Organization" LIMIT 1');
  } catch (err) {
    console.log('[SchemaValidator] Auto-migrating Organization table');
    try {
      await db.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customFeatures" JSONB');
      await db.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "rolePermissions" JSONB');
    } catch (migrateErr) {
      console.error('[SchemaValidator] Organization migration failed:', migrateErr.message);
    }
  }
};

export default { 
  ensureProjectSchema, 
  ensureChatSchema,
  ensureOrganizationSchema
};
