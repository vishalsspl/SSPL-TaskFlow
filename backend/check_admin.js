import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const u = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    console.log('Admin User:', u);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
