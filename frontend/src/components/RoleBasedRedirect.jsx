import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const RoleBasedRedirect = () => {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword && user.role !== 'ADMIN') {
    return <Navigate to="/change-password" replace />;
  }

  // ── NEW: superadmin goes to platform dashboard ─────────────────────────
  if (user.role === 'SUPERADMIN') {
    return <Navigate to="/superadmin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default RoleBasedRedirect;