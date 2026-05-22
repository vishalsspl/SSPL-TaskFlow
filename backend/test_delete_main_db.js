import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/taskflow"
        }
    }
});

async function main() {
    try {
        const id = '8b5ce493-f382-4c77-8f1b-ff93431473ee';
        const user = await prisma.user.findUnique({ where: { id } });
        console.log('User found in main db:', user);
        
        if (user) {
            console.log('Attempting to delete user from MAIN DB...');
            await prisma.user.delete({ where: { id } });
            console.log('Successfully deleted user from MAIN DB');
        } else {
            console.log('User does not exist in MAIN DB');
        }
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
