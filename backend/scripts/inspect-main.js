import pg from 'pg';

async function main() {
    const dbUrl = "postgresql://postgres:password@localhost:5432/taskflow";
    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(`Tables in ${dbUrl}:`);
        for (const row of res.rows) {
            try {
                const countRes = await client.query(`SELECT count(*) FROM "${row.table_name}"`);
                console.log(`- ${row.table_name}: ${countRes.rows[0].count}`);
            } catch (e) {
                console.log(`- ${row.table_name}: (error: ${e.message})`);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
