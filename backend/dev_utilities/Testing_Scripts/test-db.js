import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Testing DB connection...');
    try {
        await prisma.$connect();
        console.log('Successfully connected to the database!');
        const user = await prisma.user.findFirst();
        console.log('Successfully queried users:', user ? 'Found User' : 'No Users');
    } catch (e) {
        console.error('Database connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
