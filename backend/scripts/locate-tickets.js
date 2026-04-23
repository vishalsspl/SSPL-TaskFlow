import pg from 'pg';

async function main() {
  const dbs = [
    'postgres', 'taskflow', 'taskmanagement', 'template1', 'template0',
    'org_tcs_d7cfc4a5', 'org_wipro_623073a5', 'org_amdocs_d3c5ea7f',
    'org_amdocs_6c048c5d', 'org_lt_5683e928', 'tenant_template',
    'org_a28c527bbd974ed1ab752b09dc042448', 'org_b7ea9da2aa0a4fc3a106ae025a90eb5b',
    'org_3c0b7cd1e0cd4b2bbdcf7f7556f781e3'
  ];

  for (const dbName of dbs) {
    const dbUrl = `postgresql://postgres:password@localhost:5432/${dbName}`;
    const client = new pg.Client({ connectionString: dbUrl });
    try {
      await client.connect();
      const res = await client.query(`
        SELECT count(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name = 'Ticket' OR table_name = 'tickets')
      `);
      
      if (parseInt(res.rows[0].count) > 0) {
        const tableNameRes = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND (table_name = 'Ticket' OR table_name = 'tickets')
        `);
        const tableName = tableNameRes.rows[0].table_name;
        
        const countRes = await client.query(`SELECT count(*) FROM "${tableName}"`);
        const count = countRes.rows[0].count;
        
        console.log(`DB: ${dbName} | Table: ${tableName} | Count: ${count}`);
        
        if (parseInt(count) > 0) {
          const latestRes = await client.query(`
            SELECT title, "createdAt", "updatedAt" FROM "${tableName}" 
            ORDER BY "createdAt" DESC LIMIT 1
          `).catch(() => client.query(`
            SELECT title, created_at, updated_at FROM "${tableName}" 
            ORDER BY created_at DESC LIMIT 1
          `));
          console.log(`  Latest Ticket: ${JSON.stringify(latestRes.rows[0])}`);
        }
      }
    } catch (err) {
      // console.error(`Failed to connect to ${dbName}: ${err.message}`);
    } finally {
      await client.end();
    }
  }
}

main();
