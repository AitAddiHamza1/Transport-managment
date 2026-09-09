import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { platformTokenStorage } from '../utils/platformTokenStorage';
import { notify } from '../utils/notify';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const platformApi: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

platformApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = platformTokenStorage.getAccess();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshPromise: Promise<string> | null = null;

function forcePlatformLogout(message?: string): void {
  platformTokenStorage.clear();
  if (message) {
    notify.error(message);
  }
  if (window.location.pathname !== '/platform-admin/login') {
    window.location.assign('/platform-admin/login');
  }
}

async function requestNewPlatformAccessToken(): Promise<string> {
  const refreshToken = platformTokenStorage.getRefresh();
  if (!refreshToken) {
    throw new Error('no_platform_refresh_token');
  }
  const response = await axios.post(`${API_URL}/platform/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefresh } = response.data;
  platformTokenStorage.setTokens(accessToken, newRefresh);
  return accessToken;
}

platformApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthRoute = url.includes('/platform/auth/login') || url.includes('/platform/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? requestNewPlatformAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return platformApi(original);
      } catch {
        refreshPromise = null;
        forcePlatformLogout('Session administration plateforme expirée.');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
