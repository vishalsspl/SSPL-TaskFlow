import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables in DB:');
        res.rows.forEach(row => console.log(`- ${row.table_name}`));
        
        const tickets = await client.query('SELECT count(*) FROM "Ticket"');
        console.log('Count in Ticket table:', tickets.rows[0].count);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
