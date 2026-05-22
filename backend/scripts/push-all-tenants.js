import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import path from 'path';

async function main() {
    const prisma = new PrismaClient();
    try {
        const orgs = await prisma.organization.findMany({
            where: { dbUrl: { not: null } }
        });

        console.log(`Found ${orgs.length} tenant databases to update.`);

        for (const org of orgs) {
            console.log(`\nPushing schema to: ${org.name}...`);
            try {
                execSync(`npx prisma db push --schema=prisma/tenant/schema.prisma --accept-data-loss`, {
                    env: { ...process.env, TENANT_DATABASE_URL: org.dbUrl },
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
                console.log(`✅ Successfully updated schema for ${org.name}`);
            } catch (err) {
                console.error(`❌ Failed to update schema for ${org.name}:`, err.message);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
