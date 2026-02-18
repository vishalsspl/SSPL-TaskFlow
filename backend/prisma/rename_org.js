import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Renaming organization...');

    try {
        const updateResult = await prisma.organization.updateMany({
            where: {
                name: 'Global Dynamics',
            },
            data: {
                name: 'Sveltoz',
            },
        });

        console.log(`✅ Organization renamed successfully! Count: ${updateResult.count}`);
    } catch (error) {
        console.error('❌ Error renaming organization:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
