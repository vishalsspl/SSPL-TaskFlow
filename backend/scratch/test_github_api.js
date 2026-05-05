import { Octokit } from '@octokit/rest';
import prisma from '../src/lib/prisma.js';

async function main() {
  const orgId = '17674cf9-9aab-470b-98d9-b65820a3436e';
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: orgId,
        provider: 'github'
      }
    }
  });

  if (!integration) {
    console.error('Integration not found');
    return;
  }

  const octokit = new Octokit({ auth: integration.accessToken });
  const owner = 'vishalsspl';
  const repo = 'New-Test-Project';

  try {
    console.log(`Fetching commits for ${owner}/${repo}...`);
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 5
    });
    console.log('Successfully fetched commits:', commits.length);
    commits.forEach(c => {
      console.log(`- ${c.sha.substring(0, 7)}: ${c.commit.message.split('\n')[0]} by ${c.commit.author.name}`);
    });
  } catch (error) {
    console.error('GitHub API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
