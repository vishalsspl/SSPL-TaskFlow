import prisma from './src/lib/prisma.js';
async function main() {
  const invoices = await prisma.invoice.findMany({ select: { id: true, status: true, invoiceNumber: true } });
  console.log(invoices);
  await prisma.$disconnect();
}
main().catch(console.error);
