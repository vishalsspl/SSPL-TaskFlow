import prisma from '../src/lib/prisma.js';
import { getAllProjects } from '../src/controllers/projectController.js';

async function test() {
  const req = {
    user: {
      id: '0d243c08-028d-4e6d-9001-822227e85e1e',
      role: 'ADMIN',
      organizationId: '9ff43e29-661b-4a66-999f-31da11ca1481'
    },
    query: {},
    db: prisma // This is what the middleware will attach for SHARED strategy
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
