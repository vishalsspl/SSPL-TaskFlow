import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateInvoices() {
    console.log('Update existing invoices...');
    
    // Update PRO invoices
    const proUpdate = await prisma.invoice.updateMany({
        where: { plan: 'PRO' },
        data: { amount: 23400.00 }
    });
    console.log(`Updated ${proUpdate.count} PRO invoices.`);
    
    // Update STARTER invoices
    const starterUpdate = await prisma.invoice.updateMany({
        where: { plan: 'STARTER' },
        data: { amount: 1200.00 }
    });
    console.log(`Updated ${starterUpdate.count} STARTER invoices.`);

    console.log('Done!');
}

updateInvoices()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
