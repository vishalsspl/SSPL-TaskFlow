import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskmanagement";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND table_schema = 'public'");
        console.log('Columns in tickets table (taskmanagement):');
        res.rows.forEach(row => console.log(`- ${row.column_name}`));
        
        const dataRes = await client.query('SELECT title, "createdAt" FROM "tickets" LIMIT 1');
        console.log('Sample data:', dataRes.rows[0]);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
