import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { hasAccess } from '../config/routes.js';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token === null || userStr === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let effectiveUser = user;
  if (effectiveUser === null || effectiveUser === undefined) {
    try {
      effectiveUser = JSON.parse(userStr);
      useAuthStore.getState().restoreAuth(effectiveUser, token);
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  if (effectiveUser === null || effectiveUser === undefined) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let hasPermission = true;
  if (requiredRoles !== undefined && requiredRoles !== null && requiredRoles.length > 0) {
    hasPermission = requiredRoles.includes(effectiveUser.role);
  } else {
    hasPermission = hasAccess(location.pathname, effectiveUser.role);
  }

  if (hasPermission === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
