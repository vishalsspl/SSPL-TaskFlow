import prisma from '../src/lib/prisma.js';
import { getAllProjects } from '../src/controllers/projectController.js';

async function test() {
  const req = {
    user: {
      role: 'SUPERADMIN',
      organizationId: null
    },
    query: {},
    db: prisma // Simulate attachTenantDb fallback
  };

  const res = {
    json: (data) => console.log('Response:', data),
    status: (code) => ({
      json: (data) => console.log('Status:', code, 'Error:', data)
    })
  };

  try {
    await getAllProjects(req, res);
  } catch (err) {
    console.error('CRASHED:', err.message);
  }
}

test();
