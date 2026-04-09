import { PrismaClient } from '../backend/generated/tenant-client/index.js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.TENANT_DATABASE_URL }
    }
});

async function main() {
    try {
        console.log('Attempting to fetch chat messages...');
        const count = await prisma.chatMessage.count();
        console.log('ChatMessage count:', count);
        const msgs = await prisma.chatMessage.findMany({ take: 1 });
        console.log('Sample message:', msgs[0]);
    } catch (err) {
        console.error('PRISMA ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
