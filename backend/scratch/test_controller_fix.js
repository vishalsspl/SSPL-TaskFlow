import { getRepoCommits } from '../src/controllers/integrationController.js';
import prisma from '../src/lib/prisma.js';

async function test() {
  const req = {
    params: {
      owner: 'vishalsspl',
      repo: 'New-Test-Project'
    },
    user: {
      organizationId: '17674cf9-9aab-470b-98d9-b65820a3436e'
    }
  };

  const res = {
    json: (data) => {
      console.log('Response JSON:', JSON.stringify(data, null, 2));
    },
    status: (code) => {
      console.log('Response Status:', code);
      return res;
    }
  };

  console.log('Testing getRepoCommits with empty repo...');
  await getRepoCommits(req, res);
}

test()
  .catch(e => console.error('Test Error:', e))
  .finally(async () => await prisma.$disconnect());
