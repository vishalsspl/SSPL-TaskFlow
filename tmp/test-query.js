import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Testing Global Invoices ---');
  try {
    const invoices = await prisma.invoice.findMany({
      take: 1,
      include: {
        organization: {
          include: {
            _count: { select: { users: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Invoices success:', invoices.length);
  } catch (e) {
    console.error('Invoices failed:', e.message);
  }

  console.log('\n--- Testing Global Audit Logs ---');
  try {
    const logs = await prisma.activityLog.findMany({
      take: 1,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            organization: { select: { name: true } }
          }
        },
        organization: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Audit Logs success:', logs.length);
  } catch (e) {
    console.error('Audit Logs failed:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
