import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    // Test basic connection
    const count = await prisma.user.count();
    console.log('Total users in main DB:', count);
    
    // Test the exact login query
    const user = await prisma.user.findFirst({
      where: { email: 'admin@sspl.com' },
      include: { organization: true },
    });
    
    if (user) {
      console.log('User found:', user.name);
      console.log('Org:', user.organization?.name);
      console.log('Org dbUrl:', user.organization?.dbUrl ? 'SET' : 'NOT SET');
      console.log('Org status:', user.organization?.status);
      console.log('Org plan:', user.organization?.plan);
    } else {
      console.log('No user found with that email');
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
