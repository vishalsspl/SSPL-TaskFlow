import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = "a752d275-0d36-4427-9263-0b020bc8c868";
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    console.log('Result:', org ? 'Found' : 'Not Found');
    if (org) console.log(org);
    
    // Also search by name if it's "Sveltoz Solutions Private Limited"
    const orgsByName = await prisma.organization.findMany({
      where: { name: { contains: 'Sveltoz', mode: 'insensitive' } }
    });
    console.log('Orgs with "Sveltoz" in name:', orgsByName.length);
    orgsByName.forEach(o => console.log(`- ${o.name} (${o.id}) Strategy: ${o.dbStrategy}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
