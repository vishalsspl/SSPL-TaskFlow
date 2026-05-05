import prisma from '../src/lib/prisma.js';

async function listMainUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, organizationId: true }
    });
    console.log('--- Main DB Users ---');
    users.forEach(u => console.log(`${u.id} | ${u.name} | ${u.email} | ${u.role} | Org: ${u.organizationId}`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

listMainUsers();
