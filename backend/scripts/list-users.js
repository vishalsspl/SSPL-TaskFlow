import prisma from '../src/lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, isApproved: true, organization: { select: { name: true } } }
  });
  
  console.log('--- All Users in MAIN DB ---');
  users.forEach(u => {
    console.log(`- ${u.email} (${u.role}) [Org: ${u.organization?.name || 'N/A'}] [Approved: ${u.isApproved}]`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
