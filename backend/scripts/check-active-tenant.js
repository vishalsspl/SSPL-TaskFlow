import prisma from '../src/lib/prisma.js';
import pg from 'pg';

async function main() {
    try {
        const orgs = await prisma.organization.findMany({
            where: { dbStrategy: 'DEDICATED' },
            select: { id: true, name: true, dbUrl: true }
        });

        console.log(`Checking ${orgs.length} tenants...`);

        for (const org of orgs) {
            const client = new pg.Client({ connectionString: org.dbUrl });
            try {
                await client.connect();
                const res = await client.query('SELECT count(*) FROM "Ticket"');
                console.log(`- Org: ${org.name} (${org.id}) -> Tickets: ${res.rows[0].count}`);
            } catch (err) {
                console.error(`- Org: ${org.name} -> Error: ${err.message}`);
            } finally {
                await client.end();
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
