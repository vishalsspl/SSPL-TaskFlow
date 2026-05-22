import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448"
        }
    }
});

async function main() {
    try {
        // Find a client
        const client = await prisma.user.findFirst({
            where: { role: 'CLIENT' }
        });

        if (!client) {
            console.log('No client found to delete.');
            return;
        }

        console.log(`Attempting to delete client: ${client.email} (${client.id})`);
        
        try {
            await prisma.user.delete({
                where: { id: client.id }
            });
            console.log('Successfully deleted client!');
        } catch (err) {
            console.error('Error during deletion:', err);
        }

    } catch (error) {
        console.error('Initial Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
