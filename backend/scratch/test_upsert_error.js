import prisma from '../src/lib/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function testUpsert() {
  const id = '177574c6-ea59-4cb6-8828-cf6ac23e33a9';
  const orgId = '17674cf9-9aab-470b-98d9-b65820a3436e';
  
  const mainUpdate = { name: 'Sachin Kholi', role: 'CLIENT' };

  try {
    console.log('Attempting upsert for user:', id);
    const result = await prisma.user.upsert({
      where: { id },
      update: mainUpdate,
      create: {
        id,
        organizationId: orgId,
        name: 'Sachin Kholi',
        email: 'client@sspl.com',
        role: 'CLIENT',
        passwordHash: '$2a$10$something', // dummy hash if missing
        isApproved: true,
        mustChangePassword: false
      }
    });
    console.log('Upsert successful:', result.id);
  } catch (err) {
    console.error('Upsert failed with error:', err.message);
    if (err.code) console.error('Error code:', err.code);
  } finally {
    await prisma.$disconnect();
  }
}

testUpsert();
