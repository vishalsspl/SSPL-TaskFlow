import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/taskflow_main"
        }
    }
});

async function main() {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: '17674cf9-9aab-470b-98d9-b65820a3436e' }
        });
        console.log('Org:', org);
        
        // Also check if the user exists in MAIN DB
        const user = await prisma.user.findUnique({
            where: { id: 'e8f22315-8a6b-4364-a37e-d345ecae3f63' }
        });
        console.log('User in MAIN DB:', user);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
