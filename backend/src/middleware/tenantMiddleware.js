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
      select: { name: true, dbUrl: true, dbStrategy: true },
    });

    if (!org) {
      console.warn(`[TenantMiddleware] Organization not found: ${organizationId}`);
      req.db = prisma;
      return next();
    }

    if (!org.dbUrl || org.dbStrategy !== 'DEDICATED') {
      // No dedicated DB — fallback to main DB (for SHARED strategy or missing dbUrl)
      // Note: If shared strategy is used, models must exist in main prisma client
      req.db = prisma;
      req.isSharedDb = true;
      return next();
    }

    // Get (or create) a PrismaClient for this tenant's database
    try {
      const tenantClient = await tenantDbManager.getClient(org.dbUrl);
      req.db = tenantClient;
      next();
    } catch (dbErr) {
      console.error(`[TenantMiddleware] Failed to connect to tenant DB for "${org.name}":`, dbErr.message);
      
      // We still attach prisma to avoid "undefined" errors in some places, 
      // but we mark it as failed so controllers can handle it.
      req.db = prisma;
      req.tenantDbError = dbErr.message;
      next();
    }
  } catch (error) {
    console.error('[TenantMiddleware] Critical error resolving tenant DB:', error.message);
    req.db = prisma;
    next();
  }
};

export default attachTenantDb;
