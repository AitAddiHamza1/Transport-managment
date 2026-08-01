import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { FullScreenLoader } from '../shared';

/**
 * Protège les routes nécessitant une authentification.
 * - pendant la restauration de session -> loader ;
 * - non authentifié -> redirection vers /login (en mémorisant la cible).
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoader label="Vérification de la session…" />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
