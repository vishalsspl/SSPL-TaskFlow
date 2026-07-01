import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const superadmin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' }
  });

  if (!superadmin) {
    console.log("No superadmin found");
    return;
  }

  const token = jwt.sign(
    { userId: superadmin.id, role: superadmin.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '24h' }
  );

  console.log(token);
}

main().finally(() => prisma.$disconnect());
