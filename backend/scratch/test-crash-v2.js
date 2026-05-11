import prisma from '../src/lib/prisma.js';
import { getAllProjects } from '../src/controllers/projectController.js';

async function test() {
  const req = {
    user: {
      role: 'SUPERADMIN',
      organizationId: null
    },
    query: {},
    db: prisma
  };

  const res = {
    json: (data) => {
      console.log('Response (JSON):', Array.isArray(data) ? 'Array (len: ' + data.length + ')' : data);
    },
    status: (code) => {
      console.log('Status set to:', code);
      return {
        json: (data) => console.log('Response (Error JSON):', data)
      };
    }
  };

  console.log('--- Testing SuperAdmin (Should return empty array or handled error, NOT crash) ---');
  try {
    await getAllProjects(req, res);
    console.log('PASS: No crash occurred.');
  } catch (err) {
    console.error('FAIL: Still crashed:', err.message);
  }

  console.log('\n--- Testing with tenantDbError (Simulated connection failure) ---');
  const reqError = {
    ...req,
    tenantDbError: 'Connection timeout'
  };
  try {
    await getAllProjects(reqError, res);
  } catch (err) {
    console.error('FAIL: Crashed on error handling:', err.message);
  }
}

test();
