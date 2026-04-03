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
    if (organization) {
      // With the new architecture, all orgs have dbUrl and dbStrategy = DEDICATED
      req.db = getTenantPrismaClient(organization);
      
      // 4. Upgrade req.user with local tenant-specific properties
      if (req.user && req.user.id) {
        try {
          const localUser = await req.db.user.findUnique({
            where: { id: req.user.id }
          });
          if (localUser) {
            req.user = {
              ...req.user,
              ...localUser,
              // maintain the organization object injected by global DB
              organization: req.user.organization
            };
          }
        } catch (err) {
          console.error('[TenantMiddleware] Could not resolve local user profile in tenant DB', err.message);
        }
      }
    } else {
      req.db = prisma;
    }

    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error resolving tenant DB:', error.message);
    // Fallback to shared DB to avoid breaking existing functionality immediately
    req.db = prisma;
    next();
  }
};

export default attachTenantDb;
