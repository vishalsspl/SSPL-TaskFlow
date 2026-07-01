import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetSuperAdmin() {
  try {
    const newPassword = 'admin'; // Hardcoded password for reset
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' }
    });

    if (!superAdmin) {
      console.log('No superadmin found in the database!');
      return;
    }

    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { passwordHash: hashedPassword }
    });

    console.log(`Successfully reset password for SUPERADMIN (${superAdmin.email}) to: ${newPassword}`);
  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetSuperAdmin();
