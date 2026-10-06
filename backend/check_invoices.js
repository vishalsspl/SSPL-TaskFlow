import prisma from './src/lib/prisma.js';
async function main() {
  const count = await prisma.invoice.count();
  console.log('Total invoices in DB:', count);
  await prisma.$disconnect();
}
main().catch(console.error);
