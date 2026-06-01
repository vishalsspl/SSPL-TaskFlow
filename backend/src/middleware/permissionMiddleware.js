import { getDefaultPermissions } from '../config/permissionDefaults.js';

/**
 * Middleware to enforce granular role-based permissions.
 * Bypassed for SUPERADMIN and ADMIN.
 * CLIENT bypass is NOT done here; they are governed by the permission matrix.
 */
export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      // If no user context, fail
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: User not found in request context.' });
      }

      // SUPERADMIN and ADMIN always have full access
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
        return next();
      }

      // Only MANAGER, MEMBER, CLIENT require permission checks
      if (!['MANAGER', 'MEMBER', 'CLIENT'].includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Invalid role for permission check.' });
      }

      // We need organization to get customized permissions
      const org = req.organization; 
      if (!org) {
        // If there's no org context, we fallback to defaults
        // E.g. in some global routes
      }

      const defaults = getDefaultPermissions();
      const roleDefaults = defaults[user.role] || {};
      
      // Default value for this specific permission
      const defaultHasPermission = roleDefaults[permissionKey] || false;

      // If org has customized rolePermissions, check those
      let hasPermission = defaultHasPermission;
      if (org && org.rolePermissions && org.rolePermissions[user.role]) {
        const orgRoleOverrides = org.rolePermissions[user.role];
        // If the specific key is defined in overrides, use it
        if (typeof orgRoleOverrides[permissionKey] === 'boolean') {
          hasPermission = orgRoleOverrides[permissionKey];
        }
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Forbidden: Your role (${user.role}) does not have permission to perform this action (${permissionKey}).` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error during permission check' });
    }
  };
};
