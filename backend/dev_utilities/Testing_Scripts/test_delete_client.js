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
        const id = '8b5ce493-f382-4c77-8f1b-ff93431473ee';
        const user = await db.user.findUnique({ where: { id } });
        console.log('User found in tenant db:', user);
        
        if (user) {
            console.log('Attempting to delete user...');
            await db.user.delete({ where: { id } });
            console.log('Successfully deleted user from tenant db');
        } else {
            console.log('User does not exist in tenant DB');
        }
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await db.$disconnect();
    }
}

main();
