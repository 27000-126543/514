import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { hasAccess } from "../config/routes.js";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" state={ { from: location }} replace />;
  }

  let effectiveUser = user;
  if (!effectiveUser) {
    try {
      effectiveUser = JSON.parse(userStr);
    } catch {}
  }

  if (!effectiveUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRoleAccess = hasAccess(location.pathname, effectiveUser.role);
    if (!hasRoleAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
