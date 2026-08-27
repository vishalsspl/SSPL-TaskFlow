import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from './generated/tenant-client/index.js';
const prisma = new PrismaClient({ datasources: { db: { url: process.env.TENANT_DATABASE_URL } } });
prisma.project.findMany({ include: { manager: true, managers: true } })
  .then(p => console.log(JSON.stringify(p.map(x => ({ name: x.name, managerId: x.managerId, managersCount: x.managers.length })), null, 2)))
  .catch(e => console.log('Error', e))
  .finally(() => prisma.$disconnect());
