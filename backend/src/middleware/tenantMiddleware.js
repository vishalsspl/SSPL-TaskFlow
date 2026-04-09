import prisma from '../lib/prisma.js';
import tenantDbManager from '../lib/tenantDbManager.js';

/**
 * Tenant Database Middleware
 * 
 * Resolves the correct database connection for the current request:
 * - SUPERADMIN requests: `req.db` = main prisma client (they manage platform-level data)
 * - Org users: `req.db` = tenant PrismaClient connected to the org's dedicated database
 * 
 * Requires `authenticate` middleware to have already set `req.user`.
 */
export const attachTenantDb = async (req, res, next) => {
  try {
    // If no user (unauthenticated route), attach main DB as fallback
    if (!req.user) {
      req.db = prisma;
      return next();
    }

    // SUPERADMIN uses main DB (no tenant)
    if (req.user.role === 'SUPERADMIN') {
      req.db = prisma;
      return next();
    }

    const organizationId = req.user.organizationId;
    if (!organizationId) {
      req.db = prisma;
      return next();
    }

    // Look up the organization's dbUrl from MAIN DB
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { dbUrl: true, dbStrategy: true },
    });

    if (!org || !org.dbUrl || org.dbStrategy !== 'DEDICATED') {
      // No dedicated DB — fallback to main DB (for SHARED strategy or missing dbUrl)
      req.db = prisma;
      return next();
    }

    // Get (or create) a PrismaClient for this tenant's database
    const tenantClient = await tenantDbManager.getClient(org.dbUrl);
    req.db = tenantClient;
    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error resolving tenant DB:', error.message);
    const fs = await import('fs');
    fs.appendFileSync('tenant_middleware_error.log', new Date().toISOString() + ' ' + error.message + '\n' + (error.stack || '') + '\n');
    // Fail open with main DB rather than crashing the request
    req.db = prisma;
    next();
  }
};

export default attachTenantDb;
