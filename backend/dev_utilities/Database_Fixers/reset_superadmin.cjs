const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetSuperAdmin() {
  try {
    const newPassword = 'admin'; // You can change this
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
      data: { password: hashedPassword }
    });

    console.log(`Successfully reset password for SUPERADMIN (${superAdmin.email}) to: ${newPassword}`);
  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetSuperAdmin();
