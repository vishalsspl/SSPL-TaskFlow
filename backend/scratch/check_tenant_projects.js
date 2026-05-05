import tenantDbManager from '../src/lib/tenantDbManager.js';

async function main() {
  const dbUrl = "postgresql://postgres:password@localhost:5432/org_a28c527bbd974ed1ab752b09dc042448";
  
  try {
    const client = await tenantDbManager.getClient(dbUrl);
    const projects = await client.project.findMany();
    console.log('--- Projects in Tenant DB ---');
    projects.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`GitHub Repo: ${p.githubRepo}`);
      console.log('---');
    });
  } catch (e) {
    console.error('Error fetching projects from tenant DB:', e.message);
  } finally {
    await tenantDbManager.disconnectAll();
  }
}

main();
