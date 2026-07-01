import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrgs() {
    const orgs = await prisma.organization.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        }
    });

    console.log('Organizations and User Counts:');
    orgs.forEach(org => {
        console.log(`${org.name} (${org.id}): ${org._count.users} users`);
    });
}

checkOrgs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
