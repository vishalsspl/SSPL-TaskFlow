import { PrismaClient } from './generated/tenant-client/index.js';

const db = new PrismaClient({
    datasources: {
        db: {
            url: process.env.TENANT_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/taskflow_tenant1"
        }
    }
});

async function main() {
    try {
        const id = 'e8f22315-8a6b-4364-a37e-d345ecae3f63';
        console.log(`Attempting to delete user ${id}`);
        await db.user.delete({ where: { id } });
        console.log('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
    } finally {
        await db.$disconnect();
    }
}

main();
