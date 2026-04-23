import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskmanagement";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query('SELECT name, "dbUrl" FROM "organizations"');
        console.log('Organizations in taskmanagement:');
        res.rows.forEach(row => console.log(`- ${row.name}: ${row.dbUrl}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
