import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { tokenStorage } from '../../utils/tokenStorage';
import { notify } from '../../utils/notify';
import { emptyMatrix, type PermissionAction } from '../../constants/permissions';
import { canCheck } from '../../lib/permissions/evaluator';
import { authApi } from './authApi';
import { clearAuth, setUser, setStatus } from './authSlice';
import type { AuthTokens, LoginPayload } from './types';

/** État d'authentification + actions (login/logout/permissions). */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);

  const logout = () => {
    tokenStorage.clear();
    dispatch(clearAuth());
    notify.info('Vous êtes déconnecté.');
  };

  /** L'utilisateur connecté a-t-il l'autorisation module × action ? */
  const can = (moduleKey: string, action: PermissionAction = 'voir'): boolean =>
    canCheck(user?.permissions ?? null, Boolean(user?.isAdminGeneral), moduleKey, action);

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'idle' || status === 'loading',
    isAdminGeneral: Boolean(user?.isAdminGeneral),
    can,
    logout,
  };
}

/** Mutation React Query pour la connexion. */
export function useLogin() {
  const dispatch = useAppDispatch();

  return useMutation<AuthTokens, unknown, LoginPayload>({
    mutationFn: (payload) => authApi.login(payload),
    onSuccess: async (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      // Authentifie immédiatement avec un profil minimal pour éviter un rebond de route…
      dispatch(
        setUser({
          ...data.user,
          isAdminGeneral: data.user.role === 'ADMIN_GENERAL' || data.user.role === 'ADMIN',
          permissions: emptyMatrix(),
        }),
      );
      // …puis repasse en loading pendant l'enrichissement des permissions réelles.
      // Cela empêche PermissionRoute d'afficher ForbiddenState pendant la fenêtre
      // où l'utilisateur est 'authenticated' mais avec emptyMatrix().
      dispatch(setStatus('loading'));
      try {
        const full = await authApi.me();
        dispatch(setUser(full));
      } catch {
        /* le profil minimal reste actif — setUser l'a déjà défini */
        dispatch(setStatus('authenticated'));
      }
    },
  });
}
