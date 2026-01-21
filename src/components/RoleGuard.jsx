import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, isAdmin, isMechanic } from '../lib/auth';

export function RequireAuth({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

export function RequireAdmin({ children, fallback = null }) {
  if (!isAdmin()) {
    return fallback || <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function RequireMechanic({ children, fallback = null }) {
  if (!isMechanic()) {
    return fallback;
  }

  return children;
}

// Legacy compatibility
export function RequireOwner({ children, fallback = null }) {
  return RequireAdmin({ children, fallback });
}
