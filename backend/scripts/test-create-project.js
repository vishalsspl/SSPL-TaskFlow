import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testProjectCreation() {
  try {
    // Get any admin user from a SHARED organization
    const org = await prisma.organization.findFirst({ where: { status: 'ACTIVE' } });
    if (!org) {
      console.log('No active org found.');
      return;
    }

    const admin = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'ADMIN' },
    });

    if (!admin) {
      console.log('No admin found for org.');
      return;
    }

    const token = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    console.log(`Testing as User: ${admin.email} in Org: ${org.name}`);

    // Create a payload similar to CreateProjectForm
    const payload = {
      name: 'Test Project ' + Date.now(),
      description: 'Test description',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      totalBudget: 1000,
      status: 'PLANNING',
      category: 'INTERNAL',
      clientId: null,
      managerId: null,
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('http://localhost:5000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    console.log(`\nResponse Status: ${response.status}`);
    console.log(`Response Body: ${body}`);

  } catch (error) {
    console.error('Script Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectCreation();
