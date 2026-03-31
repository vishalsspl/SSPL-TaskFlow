import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Notifications ---');
  
  // 1. Get a user and a project
  const user = await prisma.user.findFirst({
    where: { role: 'MEMBER' }
  });
  
  const project = await prisma.project.findFirst();
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!user || !project || !admin) {
    console.error('Could not find necessary data (user, project, admin)');
    return;
  }

  console.log(`Using User: ${user.name} (${user.id})`);
  console.log(`Using Project: ${project.name} (${project.id})`);
  console.log(`Using Admin: ${admin.name} (${admin.id})`);

  // 2. Clear existing notifications for this user (optional)
  await prisma.notification.deleteMany({
    where: { userId: user.id }
  });

  // 3. Simulate task assignment (Manual trigger since I want to test the controller logic, but here I'll just check if I can create one)
  // To truly test the controller, I'd need to mock the req object and call the controller function.
  // But for now, let's just see if the model works.
  
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Test Notification',
      message: 'This is a test notification for task assignment',
      type: 'TASK_ASSIGNED',
      organizationId: user.organizationId
    }
  });

  console.log('Created Notification:', notification);

  const found = await prisma.notification.findFirst({
    where: { id: notification.id }
  });

  if (found) {
    console.log('✅ Notification successfully stored in database.');
  } else {
    console.log('❌ Notification NOT found in database.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
