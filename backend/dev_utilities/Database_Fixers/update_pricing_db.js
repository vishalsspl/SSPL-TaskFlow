import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePricing() {
    console.log('UPDATING LIVE PRICING DATABASE...');
    
    const settings = [
        { key: 'starter_per_user_price', value: '5000' },
        { key: 'pro_per_user_price', value: '15000' },
    ];

    for (const { key, value } of settings) {
        await prisma.platformSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        console.log(`- Set ${key} to ${value}`);
    }

    // Recalculate and update existing invoices too if they match these plans
    const invoices = await prisma.invoice.findMany({
        where: { status: 'PENDING' },
        include: { organization: { include: { _count: { select: { users: true } } } } }
    });

    console.log(`Processing ${invoices.length} pending invoices for recalculation...`);
    for (const inv of invoices) {
        let newAmount = 0;
        const users = inv.organization._count.users || 0;
        
        if (inv.plan === 'PRO') newAmount = 15000 * users;
        else if (inv.plan === 'STARTER') newAmount = 5000 * users;
        
        if (newAmount > 0) {
            await prisma.invoice.update({
                where: { id: inv.id },
                data: { amount: newAmount }
            });
            console.log(`  Updated invoice ${inv.id.slice(0,8)}... to ₹${newAmount.toLocaleString()}`);
        }
    }

    console.log('DONE!');
}

updatePricing()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
