import { useEffect, type ReactNode } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { tokenStorage } from '../../utils/tokenStorage';
import { authApi } from './authApi';
import { clearAuth, setStatus, setUser } from './authSlice';

/**
 * Restaure la session au démarrage :
 *  - si un token existe, on récupère le profil via /auth/me pour réhydrater l'utilisateur ;
 *  - en cas d'échec (token invalide/expiré non renouvelable), on nettoie la session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStorage.hasSession()) {
        dispatch(clearAuth());
        return;
      }
      dispatch(setStatus('loading'));
      try {
        const user = await authApi.me();
        if (!cancelled) {
          dispatch(setUser(user));
        }
      } catch {
        if (!cancelled) {
          tokenStorage.clear();
          dispatch(clearAuth());
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
