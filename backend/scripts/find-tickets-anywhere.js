import pg from 'pg';

async function main() {
    const dbs = [
        'postgres', 'taskmanagement', 'org_tcs_d7cfc4a5', 'org_wipro_623073a5',
        'org_amdocs_d3c5ea7f', 'org_amdocs_6c048c5d', 'org_lt_5683e928',
        'taskflow', 'tenant_template', 'org_a28c527bbd974ed1ab752b09dc042448',
        'org_b7ea9da2aa0a4fc3a106ae025a90eb5b', 'org_3c0b7cd1e0cd4b2bbdcf7f7556f781e3'
    ];

    for (const dbName of dbs) {
        const dbUrl = `postgresql://postgres:password@localhost:5432/${dbName}`;
        const client = new pg.Client({ connectionString: dbUrl });
        try {
            await client.connect();
            
            // Check for Ticket table
            const resCaseSensitive = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name = 'Ticket' OR table_name = 'ticket')");
            
            if (resCaseSensitive.rows.length > 0) {
                const tableName = resCaseSensitive.rows[0].table_name;
                const countRes = await client.query(`SELECT count(*) FROM "${tableName}"`);
                console.log(`DB: ${dbName} -> Table: ${tableName} -> Count: ${countRes.rows[0].count}`);
            } else {
                // console.log(`DB: ${dbName} -> No Ticket/ticket table found`);
            }
        } catch (err) {
            // console.error(`DB: ${dbName} -> Error: ${err.message}`);
        } finally {
            await client.end();
        }
    }
}

main();
