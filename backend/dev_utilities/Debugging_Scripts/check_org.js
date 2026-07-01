import pg from 'pg';
const { Client } = pg;
const c = new Client('postgresql://postgres:password@localhost:5432/taskflow');
await c.connect();

// Restore remaining org dbUrls
const mappings = [
  { id: '17674cf9-9aab-470b-98d9-b65820a3436e', name: 'SSPL', db: 'org_a28c527bbd974ed1ab752b09dc042448' },
  { id: '1859c188-f06f-47c9-a5c6-b91fc2ba85c3', name: 'ACME', db: 'org_b7ea9da2aa0a4fc3a106ae025a90eb5b' },
  { id: 'a1afc45c-8086-42ce-b4c6-4ff45cad3d0a', name: 'TECHNOVA', db: 'org_3c0b7cd1e0cd4b2bbdcf7f7556f781e3' },
];

console.log('--- Restoring dbUrl for SSPL, ACME, TECHNOVA ---');
for (const m of mappings) {
  const dbUrl = `postgresql://postgres:password@localhost:5432/${m.db}`;
  await c.query('UPDATE "Organization" SET "dbUrl" = $1, "dbStrategy" = \'DEDICATED\' WHERE "id" = $2', [dbUrl, m.id]);
  console.log(`✅ ${m.name} -> ${m.db}`);
}

// Verify all orgs now have dbUrl
const verify = await c.query('SELECT name, "dbUrl" IS NOT NULL as has_url FROM "Organization"');
console.log('\n--- Verification ---');
verify.rows.forEach(r => console.log(`  ${r.name}: ${r.has_url ? '✅ has dbUrl' : '❌ missing dbUrl'}`));

// Add GitHub columns to ALL tenant databases
console.log('\n--- Adding GitHub columns to tenant databases ---');
const allOrgs = await c.query('SELECT name, "dbUrl" FROM "Organization" WHERE "dbUrl" IS NOT NULL');

for (const org of allOrgs.rows) {
  try {
    const tc = new Client({ connectionString: org.dbUrl });
    await tc.connect();
    
    const tableCheck = await tc.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'Project' LIMIT 1");
    if (tableCheck.rows.length > 0) {
      await tc.query('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubRepo" TEXT');
      await tc.query('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubInstallationId" TEXT');
      console.log(`✅ ${org.name}: GitHub columns added to Project`);
    } else {
      console.log(`⚠️  ${org.name}: No Project table`);
    }
    await tc.end();
  } catch (e) {
    console.log(`❌ ${org.name}: ${e.message}`);
  }
}

await c.end();
console.log('\n🎉 ALL DONE! Now run:');
console.log('1. taskkill /F /IM node.exe');
console.log('2. npm run db:generate:all');
console.log('3. npm run dev');
