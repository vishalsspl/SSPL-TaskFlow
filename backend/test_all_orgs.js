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
        const orgs = await prisma.organization.findMany();
        console.log('All Organizations:');
        orgs.forEach(o => console.log(o.id, o.name, o.dbUrl, o.dbStrategy));
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
