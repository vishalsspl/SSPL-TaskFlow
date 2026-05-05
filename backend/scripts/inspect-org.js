import prisma from '../src/lib/prisma.js';
import tenantDbManager from '../src/lib/tenantDbManager.js';

async function main() {
  const orgId = '17674cf9-9aab-470b-98d9-b65820a3436e';
  
  console.log(`Checking Organization ID: ${orgId}`);
  
  const mainOrg = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  if (!mainOrg) {
    console.log('Organization not found in MAIN DB!');
    return;
  }

  console.log('\n--- MAIN DB Details ---');
  console.log(`Name: ${mainOrg.name}`);
  console.log(`Plan: ${mainOrg.plan}`);
  console.log(`Max Projects: ${mainOrg.maxProjects}`);
  console.log(`Max Users: ${mainOrg.maxUsers}`);
  console.log(`DB URL: ${mainOrg.dbUrl}`);

  if (!mainOrg.dbUrl) {
    console.log('No tenant DB URL found for this organization.');
    return;
  }

  try {
    const tenantClient = await tenantDbManager.getClient(mainOrg.dbUrl);
    
    const tenantOrg = await tenantClient.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { projects: true, users: true }
        }
      }
    });

    if (!tenantOrg) {
      console.log('Organization not found in TENANT DB!');
      return;
    }

    console.log('\n--- TENANT DB Details ---');
    console.log(`Name: ${tenantOrg.name}`);
    console.log(`Current Project Count: ${tenantOrg._count.projects}`);
    console.log(`Current User Count: ${tenantOrg._count.users}`);
    console.log(`Max Projects (in tenant): ${tenantOrg.maxProjects}`);
    console.log(`Max Users (in tenant): ${tenantOrg.maxUsers}`);

    const projects = await tenantClient.project.findMany({
      where: { organizationId: orgId },
      select: { name: true, status: true }
    });
    console.log('\n--- Projects in Tenant DB ---');
    projects.forEach(p => console.log(`- ${p.name} (${p.status})`));

  } catch (err) {
    console.error('Failed to connect to tenant DB:', err.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
