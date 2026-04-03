import { getActiveFeatures } from '../controllers/authController.js';
import prisma from '../lib/prisma.js';

/**
 * Feature Gate Middleware
 * 
 * Blocks API access if the requested feature is disabled for the user's organization.
 * Uses the same `getActiveFeatures()` resolution logic as login/me endpoints.
 * 
 * Usage in routes:
 *   router.use(authenticate, requireFeature('kanban'));
 *   router.get('/', controller);
 * 
 * @param {string} featureKey - The feature key to check (e.g., 'projects', 'kanban', 'chat')
 */
export const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      // SUPERADMIN bypasses all feature gates
      if (req.user?.role === 'SUPERADMIN') {
        return next();
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        // No org context — let downstream handlers deal with it
        return next();
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true, customFeatures: true },
      });

      if (!org) {
        return next();
      }

      const activeFeatures = await getActiveFeatures(org);

      // Normalize keys to lowercase for case-insensitive matching
      const normalizedFeatures = {};
      Object.keys(activeFeatures).forEach(k => {
        normalizedFeatures[k.toLowerCase()] = activeFeatures[k];
      });

      const isEnabled = normalizedFeatures[featureKey.toLowerCase()];

      // Only block if explicitly set to false
      if (isEnabled === false) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `The "${featureKey}" feature is not included in your current plan. Please contact your administrator to upgrade.`,
          featureKey,
        });
      }

      next();
    } catch (error) {
      console.error(`[FeatureGate] Error checking feature "${featureKey}":`, error.message);
      // Fail open — don't block access due to an internal error
      next();
    }
  };
};

export default requireFeature;