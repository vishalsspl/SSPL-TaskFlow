import pg from 'pg';

async function main() {
    const mainDbUrl = "postgresql://postgres:password@localhost:5432/taskflow";
    const client = new pg.Client({ connectionString: mainDbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false");
        console.log('Databases on server:');
        res.rows.forEach(row => console.log(`- ${row.datname}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

main();
