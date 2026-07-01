import { PrismaClient } from './generated/tenant-client/index.js';

const db = new PrismaClient({
    datasources: {
        db: {
            url: process.env.TENANT_DATABASE_URL || "postgresql://postgres:password@localhost:5432/taskflow_tenant"
        }
    }
});

async function main() {
    try {
        const clients = await db.user.findMany({ where: { role: 'CLIENT' } });
        console.log('Clients in tenant db:');
        clients.forEach(c => console.log(c.id, c.name, c.email));
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await db.$disconnect();
    }
}

main();
