import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskmanagement";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query('SELECT title, created_at, updated_at FROM "tickets"');
        console.log('Tickets in taskmanagement:');
        res.rows.forEach(row => {
            console.log(`- Title: ${row.title}`);
            console.log(`  Created At: ${row.created_at}`);
            console.log(`  Updated At: ${row.updated_at}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
