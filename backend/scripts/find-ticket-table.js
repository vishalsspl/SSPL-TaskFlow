import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskflow";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT n.nspname AS schema_name, c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND c.relname ILIKE '%ticket%'");
        console.log(`Matching tables in ${dbUrl}:`);
        res.rows.forEach(row => console.log(`- ${row.schema_name}.${row.table_name}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
