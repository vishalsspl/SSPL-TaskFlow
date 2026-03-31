import { PrismaClient } from '@prisma/client';
import "dotenv/config";
const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign(
    { id: admin.id, role: admin.role, organizationId: admin.organizationId },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const res = await fetch('http://localhost:5000/api/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
