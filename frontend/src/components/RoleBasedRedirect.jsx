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

  if (user.role === 'CLIENT') {
    return <Navigate to="/task-board" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default RoleBasedRedirect;
