import prisma from '../src/lib/prisma.js';
import { PrismaClient } from '../generated/tenant-client/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkUser(userId) {
  console.log('Checking user ID:', userId);

  // 1. Check in Main DB
  try {
    const mainUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    console.log('Main DB User:', mainUser ? 'FOUND' : 'NOT FOUND');
    if (mainUser) {
      console.log('Email in Main DB:', mainUser.email);
    }
  } catch (err) {
    console.error('Error checking Main DB:', err.message);
  }

  // 2. Check in Tenant DB
  const tenantDb = new PrismaClient({
    datasources: { db: { url: process.env.TENANT_DATABASE_URL } }
  });

  try {
    const tenantUser = await tenantDb.user.findUnique({
      where: { id: userId }
    });
    console.log('Tenant DB User:', tenantUser ? 'FOUND' : 'NOT FOUND');
    if (tenantUser) {
      console.log('Email in Tenant DB:', tenantUser.email);
    }
  } catch (err) {
    console.error('Error checking Tenant DB:', err.message);
  } finally {
    await tenantDb.$disconnect();
  }
}

// User ID from the frontend or logs if available
// Since I don't have the ID, I'll search by email "client@sspl.com"
async function searchByEmail(email) {
  console.log('Searching by email:', email);

  // 1. Search in Main DB
  try {
    const mainUsers = await prisma.user.findMany({
      where: { email }
    });
    console.log('Main DB matches:', mainUsers.length);
    mainUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.name}`));
  } catch (err) {
    console.error('Error searching Main DB:', err.message);
  }

  // 2. Search in Tenant DB
  const tenantDb = new PrismaClient({
    datasources: { db: { url: process.env.TENANT_DATABASE_URL } }
  });

  try {
    const tenantUsers = await tenantDb.user.findMany({
      where: { email }
    });
    console.log('Tenant DB matches:', tenantUsers.length);
    tenantUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.name}`));
  } catch (err) {
    console.error('Error searching Tenant DB:', err.message);
  } finally {
    await tenantDb.$disconnect();
  }
}

const targetEmail = 'client@sspl.com';
searchByEmail(targetEmail).then(() => prisma.$disconnect());
