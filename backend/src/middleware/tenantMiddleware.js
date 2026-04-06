import prisma from '../lib/prisma.js';

/**
 * Tenant Database Middleware (Legacy Rollback Version)
 * 
 * In the single-database architecture, all data is stored in the primary database.
 * This middleware now simply attaches the main prisma client to `req.db`
 * to maintain compatibility with existing controllers that expect `req.db`.
 */
export const attachTenantDb = async (req, res, next) => {
  req.db = prisma;
  next();
};

export default attachTenantDb;
