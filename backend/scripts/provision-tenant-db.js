import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { provisionTenantDatabase } from '../src/services/tenantProvisioner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * CLI Tool for manual tenant database provisioning.
 * Usage: node scripts/provision-tenant-db.js --orgId=<id>
 */
async function provisionTenantDb() {
  const args = process.argv.slice(2);
  const orgIdArg = args.find((a) => a.startsWith('--orgId='));

  if (!orgIdArg) {
    console.log('\n❌ Usage: node scripts/provision-tenant-db.js --orgId=<id>\n');
    process.exit(1);
  }

  const orgId = orgIdArg.split('=')[1];

  console.log(`\n🚀 [CLI] Initiating manual provisioning for Organization: ${orgId}...\n`);

  try {
    // 1. Verify organization exists in MAIN DB
    const org = await prisma.organization.findUnique({ 
        where: { id: orgId },
        include: { 
            users: { where: { role: 'ADMIN' }, take: 1 }
        }
    });

    if (!org) {
      throw new Error(`Organization ${orgId} not found in MAIN database.`);
    }

    if (org.dbUrl && org.dbStrategy === 'DEDICATED') {
      console.warn(`⚠️  Organization ${orgId} is already set to DEDICATED (URL: ${org.dbUrl})`);
      // We continue anyway in case they want to re-provision/fix it
    }

    const admin = org.users[0];
    if (!admin) {
        throw new Error(`No ADMIN user found for organization ${orgId}. Cannot seed initial tenant data.`);
    }

    // 2. Call the central provisioner service
    const tenantDbUrl = await provisionTenantDatabase({
        orgId: org.id,
        orgName: org.name,
        orgData: {
            id: org.id,
            name: org.name,
            industry: org.industry,
            size: org.size,
            website: org.website,
            country: org.country,
            timezone: org.timezone,
            plan: org.plan,
            status: org.status,
            maxUsers: org.maxUsers,
            maxProjects: org.maxProjects,
            customFeatures: org.customFeatures
        },
        adminData: {
            id: admin.id,
            organizationId: org.id,
            name: admin.name,
            email: admin.email,
            passwordHash: admin.passwordHash,
            role: admin.role,
            isApproved: true,
            mustChangePassword: false
        }
    });

    // 3. Update Organization record in MAIN DB
    console.log(`⏳ [CLI] Finalizing organization record...`);
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        dbStrategy: 'DEDICATED',
        dbUrl: tenantDbUrl,
      },
    });

    console.log(`\n🎉 Success! Organization "${org.name}" is now fully provisioned on a dedicated database.\n`);
  } catch (error) {
    console.error('\n❌ [CLI] Manual provisioning failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

provisionTenantDb();
