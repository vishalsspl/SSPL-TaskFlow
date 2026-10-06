import prisma from './src/lib/prisma.js';
async function main() {
  const deleted = await prisma.invoice.deleteMany({ where: { status: 'PENDING' } });
  console.log('Deleted pending invoices:', deleted.count);
  await prisma.$disconnect();
}
main().catch(console.error);
