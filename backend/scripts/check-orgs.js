import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const orgs = await prisma.organization.findMany({
            select: { name: true, dbUrl: true, dbStrategy: true }
        });
        console.log(JSON.stringify(orgs, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}
main();
