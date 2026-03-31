import { PrismaClient } from '@prisma/client';
import prisma from './prisma.js'; // The default shared client

/**
 * Tenant Connection Manager
 * 
 * Maintains a cache of PrismaClient instances per database URL.
 */

/** @type {Map<string, PrismaClient>} */
const tenantClients = new Map();

// Configuration to avoid too many open connections
const MAX_CONNECTIONS_PER_TENANT = 10; 

/**
 * Gets or creates a PrismaClient for the specified database URL.
 * 
 * @param {string} dbUrl - The database connection string
 * @returns {PrismaClient}
 */
export function getTenantClient(dbUrl) {
  if (!dbUrl) {
    throw new Error('Database URL is required to get a tenant client');
  }

  // Reuse existing client if available
  if (tenantClients.has(dbUrl)) {
    return tenantClients.get(dbUrl);
  }

  try {
    // Create new PrismaClient with connection limits
    const tenantClient = new PrismaClient({
      datasources: {
        db: { 
          url: `${dbUrl}?connection_limit=${MAX_CONNECTIONS_PER_TENANT}` 
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    // Eagerly try connecting, handle errors safely
    tenantClient.$connect().catch((err) => {
      console.error(`[TenantManager] Failed to connect to tenant DB: ${dbUrl}`, err.message);
      tenantClients.delete(dbUrl); // Remove from cache so we retry next time
    });

    tenantClients.set(dbUrl, tenantClient);
    console.log(`[TenantManager] Created cached connection for tenant.`);
    
    return tenantClient;
  } catch (error) {
    console.error(`[TenantManager] Error creating tenant client:`, error.message);
    throw error;
  }
}

/**
 * Wrapper for our middleware to easily pass the organization object
 * 
 * @param {object} organization 
 * @returns {PrismaClient}
 */
export function getTenantPrismaClient(organization) {
  // Use shared DB if strategy is SHARED or if no DEDICATED config exists
  if (!organization || organization.dbStrategy !== 'DEDICATED' || !organization.dbUrl) {
    return prisma;
  }

  return getTenantClient(organization.dbUrl);
}

/**
 * Disconnect all cached tenant clients (clean shutdown).
 */
export async function disconnectAllTenants() {
  const entries = [...tenantClients.entries()];
  
  await Promise.allSettled(
    entries.map(async ([url, client]) => {
      try {
        await client.$disconnect();
      } catch (err) {
        console.error(`[TenantManager] Error disconnecting:`, err.message);
      }
    })
  );

  tenantClients.clear();
  console.log(`[TenantManager] Disconnected ${entries.length} tenant(s).`);
}

export default { getTenantClient, getTenantPrismaClient, disconnectAllTenants };
