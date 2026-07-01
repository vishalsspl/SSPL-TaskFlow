import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('--- Verifying Schema ---');
    const logsCount = await prisma.activityLog.count();
    console.log(`Total Activity Logs: ${logsCount}`);

    console.log('\n--- Verifying Relations ---');
    const sampleLog = await prisma.activityLog.findFirst({
      include: {
        organization: true,
        user: true,
      }
    });

    if (sampleLog) {
      console.log('Sample Log found:');
      console.log(`Action: ${sampleLog.action}`);
      console.log(`Organization ID Field: ${sampleLog.organizationId}`);
      console.log(`Joined Organization Name: ${sampleLog.organization?.name || 'N/A'}`);
    } else {
      console.log('No logs found to verify relations.');
    }

    console.log('\n--- Verifying Organizations ---');
    const orgs = await prisma.organization.findMany({ take: 5 });
    console.log(`Found ${orgs.length} organizations.`);
    orgs.forEach(o => console.log(`- ${o.name} (${o.id})`));

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
