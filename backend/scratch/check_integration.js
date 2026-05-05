import prisma from '../src/lib/prisma.js';

async function main() {
  const orgId = '17674cf9-9aab-470b-98d9-b65820a3436e';
  
  console.log('--- Integration ---');
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: orgId,
        provider: 'github'
      }
    }
  });

  console.log('Integration found:', integration ? 'Yes' : 'No');
  
  console.log('\n--- Linked Projects ---');
  // We need to check projects in the tenant DB. 
  // Wait, integration is in the main DB, but projects are in tenant DBs.
  // The user's org ID is 17674cf9-9aab-470b-98d9-b65820a3436e.
  
  // Let's find the tenant DB URL for this org.
  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });
  
  if (!org) {
    console.error('Organization not found');
    return;
  }
  
  console.log('Org Name:', org.name);
  console.log('Tenant DB:', org.dbName);

  // Note: We can't easily connect to a dynamic tenant DB in a simple script without setup.
  // But let's try to assume the project is in the default tenant DB for now if it's a dev env.
  // Or check the main DB if projects are there (usually not in multi-tenant).
  
  // Actually, let's just check the project table in the main prisma client to see if it exists there.
  // In some setups, projects might be in the main DB if not fully separated.
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId }
    });
    console.log('Projects in Main DB:', projects.length);
    projects.forEach(p => console.log(`- ${p.name}: ${p.githubRepo}`));
  } catch (e) {
    console.log('Projects not in Main DB or table missing.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
