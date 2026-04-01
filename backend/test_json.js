import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
    const invoices = await prisma.invoice.findMany({
        include: {
            organization: {
                select: { 
                    name: true, 
                    billingEmail: true,
                    _count: { select: { users: true } }
                }
            }
        },
        take: 1
    });

    console.log('JSON structure:');
    console.log(JSON.stringify(invoices, null, 2));
}

testQuery()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
