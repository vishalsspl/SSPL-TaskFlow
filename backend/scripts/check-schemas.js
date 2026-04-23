import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskflow";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')");
        console.log(`Schemas in ${dbUrl}:`);
        res.rows.forEach(row => console.log(`- ${row.schema_name}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
