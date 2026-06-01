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

  // ── Redirect to the first available page based on permissions ──────────
  const p = user.permissions || {};
  if (user.role === 'ADMIN' || p['dashboard.view'] !== false) return <Navigate to="/dashboard" replace />;
  if (p['projects.view'] !== false) return <Navigate to="/projects" replace />;
  if (p['tasks.view'] !== false) return <Navigate to="/tasks" replace />;
  if (p['kanban.view'] !== false) return <Navigate to="/task-board" replace />;
  if (p['tickets.view'] !== false) return <Navigate to="/tickets" replace />;
  
  // Fallback
  return <Navigate to="/dashboard" replace />;
};

export default RoleBasedRedirect;