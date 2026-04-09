import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..');

// Import Prisma and the tenant DB manager
import { PrismaClient as MainClient } from '@prisma/client';
import tenantDbManager from '../src/lib/tenantDbManager.js';

async function testConnection() {
    const mainDb = new MainClient();
    try {
        const orgs = await mainDb.organization.findMany({ where: { dbUrl: { not: null } } });
        if (orgs.length === 0) {
            console.log("No organizations with dbUrl found.");
            return;
        }
        
        const org = orgs[0];
        console.log(`Testing connection for ORG: ${org.name} (${org.id})`);
        console.log(`DB URL: ${org.dbUrl}`);
        
        try {
            const tenantClient = await tenantDbManager.getClient(org.dbUrl);
            console.log("Client created successfully!");
            
            // Try a simple query
            const userCount = await tenantClient.user.count();
            console.log(`Successfully connected and ran query! User count: ${userCount}`);
        } catch (err) {
            console.error("FAILED TO CONNECT TO TENANT DB:", err);
        }
    } catch (e) {
        console.error("Main DB Error:", e);
    } finally {
        await mainDb.$disconnect();
    }
}

testConnection();
