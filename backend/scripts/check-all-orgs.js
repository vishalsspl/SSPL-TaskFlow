import prisma from '../src/lib/prisma.js';
import pg from 'pg';

async function main() {
    try {
        const orgs = await prisma.organization.findMany({
            select: { id: true, name: true, dbUrl: true, dbStrategy: true }
        });

        console.log(`Checking ${orgs.length} organizations from Main DB...`);

        for (const org of orgs) {
            console.log(`\n- Org: ${org.name} (${org.id}) [Strategy: ${org.dbStrategy}]`);
            if (org.dbStrategy === 'DEDICATED' && org.dbUrl) {
                console.log(`  Connecting to: ${org.dbUrl}`);
                const client = new pg.Client({ connectionString: org.dbUrl });
                try {
                    await client.connect();
                    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ticket'");
                    if (res.rows.length > 0) {
                        const countRes = await client.query('SELECT count(*) FROM "Ticket"');
                        console.log(`  ✅ Ticket table exists. Count: ${countRes.rows[0].count}`);
                    } else {
                        console.log(`  ❌ Ticket table NOT found.`);
                    }
                } catch (err) {
                    console.error(`  ❌ Error: ${err.message}`);
                } finally {
                    await client.end();
                }
            } else {
                console.log(`  ⚠️ Shared strategy or no DB URL.`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
