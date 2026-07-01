import prisma from './src/lib/prisma.js';

async function main() {
  console.log('--- Verifying Audit Logs ---');
  
  // Mock a user ID (the SuperAdmin)
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!superAdmin) {
    console.error('No SuperAdmin found!');
    return;
  }

  const userId = superAdmin.id;

  // 1. Simulate an action: Update an organization
  const org = await prisma.organization.findFirst();
  if (org) {
     console.log(`Updating organization: ${org.name}`);
     // Usually this would be done via the controller, but we'll manually create the log entry
     // to simulate what the controller now does.
     await prisma.activityLog.create({
        data: {
          userId,
          organizationId: org.id,
          action: 'ORG_UPDATED',
          entity: 'organization',
          entityId: org.id,
          details: { plan: 'PRO', status: 'ACTIVE' }
        }
     });
  }

  // 2. Simulate a Global action
  console.log('Logging a global action...');
  await prisma.activityLog.create({
    data: {
      userId,
      organizationId: null,
      action: 'PLATFORM_SCAN',
      entity: 'system',
      details: { status: 'completed' }
    }
  });

  // 3. Test the global filter logic
  console.log('\nTesting Global Filter (orgId: null)...');
  const globalLogs = await prisma.activityLog.findMany({
    where: { organizationId: null },
    include: { user: { select: { name: true } } }
  });
  console.log(`Found ${globalLogs.length} global logs.`);
  globalLogs.forEach(l => console.log(`- [${l.createdAt.toISOString()}] ${l.action} by ${l.user.name}`));

  // 4. Test specific org filter
  if (org) {
    console.log(`\nTesting Org Filter (orgId: ${org.id})...`);
    const orgLogs = await prisma.activityLog.findMany({
      where: { organizationId: org.id },
      include: { organization: { select: { name: true } } }
    });
    console.log(`Found ${orgLogs.length} logs for ${org.name}.`);
  }

}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
