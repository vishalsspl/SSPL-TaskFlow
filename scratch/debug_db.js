import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = '17674cf9-9aab-470b-98d9-b65820a3436e';
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { _count: { select: { projects: true } } }
  });

  console.log('Organization:', JSON.stringify(org, null, 2));

  const projectsCount = await prisma.project.count({
    where: { organizationId: orgId }
  });
  console.log('Total Projects in Main DB:', projectsCount);

  // If there's a tenant DB, check projects there too
  if (org && org.dbUrl) {
    console.log('Tenant DB URL:', org.dbUrl);
    // Note: connecting to tenant DB from script might be tricky without the manager
  }

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, email: true, role: true, isApproved: true }
  });
  console.log('Users in Organization:', JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
