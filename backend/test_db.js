import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    include: { organization: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(users.map(u => ({
    email: u.email,
    orgName: u.organization.name,
    status: u.organization.status
  })), null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
