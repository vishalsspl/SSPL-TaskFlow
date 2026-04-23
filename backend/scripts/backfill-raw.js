import prisma from '../src/lib/prisma.js';
import pg from 'pg';

async function main() {
    try {
        const orgs = await prisma.organization.findMany({
            where: { dbStrategy: 'DEDICATED' },
            select: { id: true, name: true, dbUrl: true }
        });

        console.log(`🚀 Starting RAW backfill for ${orgs.length} tenants...`);

        for (const org of orgs) {
            console.log(`\n⏳ Processing "${org.name}" (${org.id})...`);
            const client = new pg.Client({ connectionString: org.dbUrl });
            try {
                await client.connect();
                
                // Update Ticket updatedAt
                const ticketRes = await client.query('UPDATE "Ticket" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL');
                console.log(`  ✅ Updated ${ticketRes.rowCount} tickets`);

                // Update TicketComment updatedAt
                const commentRes = await client.query('UPDATE "TicketComment" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL');
                console.log(`  ✅ Updated ${commentRes.rowCount} comments`);
                
            } catch (err) {
                console.error(`  ❌ Failed: ${err.message}`);
            } finally {
                await client.end();
            }
        }

        console.log('\n🎉 Backfill completed.');
    } catch (err) {
        console.error('Backfill script failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
