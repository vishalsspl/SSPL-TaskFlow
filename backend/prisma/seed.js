import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.workload.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✅ Cleared existing data');

  // Create default organization
  const org = await prisma.organization.create({
    data: {
      name: 'My Organization',
      logoUrl: null,
      themeColor: '#3B82F6',
    },
  });

  console.log('✅ Created organization:', org.name);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Administrator',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      avatar: null,
    },
  });

  console.log('✅ Created admin user');
  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('Email: admin@example.com');
  console.log('Password: admin123');
  console.log('');
  console.log('You can now create projects, add team members, and manage tasks.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
