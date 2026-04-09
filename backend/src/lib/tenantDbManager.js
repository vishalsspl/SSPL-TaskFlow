/**
 * Tenant Database Connection Manager
 * 
 * Manages a pool of PrismaClient instances for tenant databases.
 * Uses an LRU-style cache to limit memory usage while keeping
 * frequently-accessed tenant connections alive.
 */

// We import from the generated tenant client
// This will be available after running: prisma generate --schema=prisma/tenant.prisma
let TenantPrismaClient;

try {
  const mod = await import('../../generated/tenant-client/index.js');
  TenantPrismaClient = mod.PrismaClient;
} catch (err) {
  console.warn('[TenantDbManager] Tenant client not generated yet. Run: npm run db:generate:tenant');
  // Fallback: use the main PrismaClient — useful during migration period
  const { PrismaClient } = await import('@prisma/client');
  TenantPrismaClient = PrismaClient;
}

const MAX_CACHED_CONNECTIONS = 50;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

class TenantDbManager {
  constructor() {
    /** @type {Map<string, { client: any, lastUsed: number }>} */
    this.cache = new Map();
    
    // Periodic cleanup of idle connections
    this.cleanupInterval = setInterval(() => this.cleanupIdle(), 60 * 1000);
  }

  /**
   * Get or create a PrismaClient instance for the given tenant database URL.
   * @param {string} dbUrl - The PostgreSQL connection URL for the tenant database
   * @returns {Promise<any>} A PrismaClient instance connected to the tenant DB
   */
  async getClient(dbUrl) {
    if (!dbUrl) {
      throw new Error('[TenantDbManager] No dbUrl provided');
    }

    // Return cached client if available
    if (this.cache.has(dbUrl)) {
      const entry = this.cache.get(dbUrl);
      entry.lastUsed = Date.now();
      return entry.client;
    }

    // Evict oldest if at capacity
    if (this.cache.size >= MAX_CACHED_CONNECTIONS) {
      this.evictOldest();
    }

    // Create new client
    const client = new TenantPrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    await client.$connect();

    this.cache.set(dbUrl, {
      client,
      lastUsed: Date.now(),
    });

    console.log(`[TenantDbManager] Connected to tenant DB (${this.cache.size} total connections)`);
    return client;
  }

  /**
   * Evict the least recently used connection
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      entry.client.$disconnect().catch(err => {
        console.error('[TenantDbManager] Error disconnecting evicted client:', err.message);
      });
      this.cache.delete(oldestKey);
      console.log('[TenantDbManager] Evicted idle connection');
    }
  }

  /**
   * Cleanup connections idle beyond IDLE_TIMEOUT_MS
   */
  cleanupIdle() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastUsed > IDLE_TIMEOUT_MS) {
        entry.client.$disconnect().catch(err => {
          console.error('[TenantDbManager] Error disconnecting idle client:', err.message);
        });
        this.cache.delete(key);
      }
    }
  }

  /**
   * Disconnect all cached clients (for graceful shutdown)
   */
  async disconnectAll() {
    console.log(`[TenantDbManager] Disconnecting ${this.cache.size} tenant connections...`);
    const promises = [];
    for (const [key, entry] of this.cache.entries()) {
      promises.push(
        entry.client.$disconnect().catch(err => {
          console.error(`[TenantDbManager] Error disconnecting ${key}:`, err.message);
        })
      );
    }
    await Promise.all(promises);
    this.cache.clear();
    clearInterval(this.cleanupInterval);
    console.log('[TenantDbManager] All tenant connections closed.');
  }
}

// Singleton
const tenantDbManager = new TenantDbManager();
export default tenantDbManager;
