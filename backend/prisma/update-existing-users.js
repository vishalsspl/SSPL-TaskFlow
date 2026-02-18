import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateExistingUsers() {
    try {
        console.log('Updating existing users to approved status...');

        const result = await prisma.user.updateMany({
            where: {
                isApproved: false,
            },
            data: {
                isApproved: true,
            },
        });

        console.log(`✅ Updated ${result.count} existing users to approved status`);
    } catch (error) {
        console.error('Error updating users:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateExistingUsers();
