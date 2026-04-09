import prisma from '../lib/prisma.js';
import tenantDbManager from '../lib/tenantDbManager.js';

async function syncUsers() {
  console.log('🚀 Starting User Synchronization (Main DB -> Tenant DBs)...');

  try {
    // 1. Fetch all organizations with dedicated databases
    const orgs = await prisma.organization.findMany({
      where: { dbUrl: { not: null }, dbStrategy: 'DEDICATED' }
    });

    console.log(`Found ${orgs.length} organizations to sync.`);

    for (const org of orgs) {
      console.log(`\n📦 Syncing Org: ${org.name} (${org.id})`);
      
      let tenantDb;
      try {
        tenantDb = await tenantDbManager.getClient(org.dbUrl);
      } catch (err) {
        console.error(`❌ Failed to connect to tenant DB for ${org.name}:`, err.message);
        continue;
      }

      // 2. Fetch all users for this org from the MAIN DB
      const mainUsers = await prisma.user.findMany({
        where: { organizationId: org.id }
      });

      console.log(`Found ${mainUsers.length} users in Main DB.`);

      for (const user of mainUsers) {
        try {
          // 3. Upsert user into the Tenant DB
          await tenantDb.user.upsert({
            where: { id: user.id },
            update: {
              name: user.name,
              email: user.email,
              role: user.role,
              isApproved: user.isApproved,
              mustChangePassword: user.mustChangePassword,
              passwordHash: user.passwordHash,
              organizationId: user.organizationId
            },
            create: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              isApproved: user.isApproved,
              mustChangePassword: user.mustChangePassword,
              passwordHash: user.passwordHash,
              organizationId: user.organizationId
            }
          });
          console.log(`✅ Synced User: ${user.email} (${user.role})`);
        } catch (syncErr) {
          console.error(`❌ Failed to sync user ${user.email}:`, syncErr.message);
        }
      }
    }

    console.log('\n✨ User Synchronization Complete.');
  } catch (error) {
    console.error('💥 Critical error during sync:', error);
  } finally {
    await prisma.$disconnect();
    await tenantDbManager.disconnectAll();
  }
}

syncUsers();
