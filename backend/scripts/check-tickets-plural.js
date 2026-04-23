import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskmanagement";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query('SELECT count(*) FROM "tickets"');
        console.log('Count in tickets table (taskmanagement):', res.rows[0].count);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
