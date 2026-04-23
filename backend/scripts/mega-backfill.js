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
            
            // Look for Ticket or tickets table
            const res = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name = 'Ticket' OR table_name = 'tickets')
            `);
            
            if (res.rows.length > 0) {
                const tableName = res.rows[0].table_name;
                const countRes = await client.query(`SELECT count(*) FROM "${tableName}"`);
                const count = parseInt(countRes.rows[0].count);
                
                if (count > 0) {
                    console.log(`🚀 DB: ${dbName} -> Table: ${tableName} -> Count: ${count}`);
                    
                    // Check columns
                    const colsRes = await client.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '${tableName}' 
                        AND table_schema = 'public'
                    `);
                    const cols = colsRes.rows.map(r => r.column_name);
                    
                    const hasUpdatedAt = cols.includes('updatedAt') || cols.includes('updated_at');
                    const updatedAtCol = cols.includes('updatedAt') ? 'updatedAt' : 'updated_at';
                    const createdAtCol = cols.includes('createdAt') ? 'createdAt' : 'created_at';
                    
                    if (!hasUpdatedAt) {
                        console.log(`  ➕ Adding updatedAt column to ${dbName}.${tableName}`);
                        await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "updatedAt" TIMESTAMP`);
                    }
                    
                    console.log(`  ⏳ Backfilling ${dbName}.${tableName}...`);
                    await client.query(`UPDATE "${tableName}" SET "${hasUpdatedAt ? updatedAtCol : 'updatedAt'}" = "${createdAtCol}" WHERE "${hasUpdatedAt ? updatedAtCol : 'updatedAt'}" IS NULL`);
                    console.log(`  ✅ Done.`);
                }
            }
        } catch (err) {
            // console.error(`DB: ${dbName} -> Error: ${err.message}`);
        } finally {
            await client.end();
        }
    }
}

main();
