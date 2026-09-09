import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { FullScreenLoader } from '../shared';

/**
 * Routes publiques (ex. /login).
 * Si l'utilisateur est déjà authentifié -> redirection vers le tableau de bord.
 */
export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader label="Chargement…" />;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
