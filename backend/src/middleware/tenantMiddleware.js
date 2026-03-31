import { getTenantPrismaClient } from '../lib/tenantManager.js';
import prisma from '../lib/prisma.js';

/**
 * Tenant Database Middleware
 * 
 * Attaches the correct PrismaClient to `req.db` based on the
 * authenticated user's organization.dbStrategy.
 * 
 * Must be placed AFTER the `authenticate` middleware in the chain.
 * 
 * Usage in routes:
 *   router.get('/', authenticate, attachTenantDb, controller);
 * 
 * Then in controllers:
 *   const projects = await req.db.project.findMany({ ... });
 */
export const attachTenantDb = async (req, res, next) => {
  try {
    // 1. Extract organizationId from req.user (JWT context essentially)
    const organizationId = req.user?.organizationId;

    // SUPERADMIN has no organization context or if missing — use shared DB
    if (!organizationId || req.user?.role === 'SUPERADMIN') {
      req.db = prisma;
      return next();
    }

    // 2. Fetch organization from main database
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { dbStrategy: true, dbUrl: true, id: true }
    });

    // 3. Attach appropriate client
    if (organization && organization.dbStrategy === 'DEDICATED') {
      req.db = getTenantPrismaClient(organization);
    } else {
      req.db = prisma;
    }

    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error resolving tenant DB:', error.message);
    // Fallback to shared DB to avoid breaking existing functionality
    req.db = prisma;
    next();
  }
};

export default attachTenantDb;
