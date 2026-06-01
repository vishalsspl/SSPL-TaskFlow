import useAuthStore from '../store/authStore';
import { getDefaultPermissions } from '../lib/permissionDefaults';

const usePermission = () => {
  const { user } = useAuthStore();

  const hasPermission = (permissionKey) => {
    // Safety check
    if (!user) return false;

    // SUPERADMIN and ADMIN always have full access
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return true;
    }

    // Check if permissions object exists on user
    if (user.permissions && typeof user.permissions[permissionKey] !== 'undefined') {
      return user.permissions[permissionKey];
    }

    // Fallback to defaults if permissions are somehow missing
    const defaults = getDefaultPermissions();
    if (defaults[user.role] && typeof defaults[user.role][permissionKey] !== 'undefined') {
      return defaults[user.role][permissionKey];
    }

    // Default deny
    return false;
  };

  return { 
    hasPermission, 
    permissions: user?.permissions || {} 
  };
};

export default usePermission;
