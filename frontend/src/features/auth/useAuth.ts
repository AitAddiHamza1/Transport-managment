import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { tokenStorage } from '../../utils/tokenStorage';
import { notify } from '../../utils/notify';
import { authApi } from './authApi';
import { clearAuth, setUser } from './authSlice';
import type { AuthTokens, LoginPayload, RegisterPayload } from './types';

/** État d'authentification + actions (login/logout). */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);

  const logout = () => {
    tokenStorage.clear();
    dispatch(clearAuth());
    notify.info('Vous êtes déconnecté.');
  };

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'idle' || status === 'loading',
    logout,
  };
}

/** Mutation React Query pour la connexion. */
export function useLogin() {
  const dispatch = useAppDispatch();

  return useMutation<AuthTokens, unknown, LoginPayload>({
    mutationFn: (payload) => authApi.login(payload),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      dispatch(setUser(data.user));
    },
  });
}

/** Mutation React Query pour l'inscription. */
export function useRegister() {
  return useMutation<void, unknown, RegisterPayload>({
    mutationFn: (payload) => authApi.register(payload),
  });
}
