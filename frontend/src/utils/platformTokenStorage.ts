const PLATFORM_ACCESS_KEY = 'platform_access_token';
const PLATFORM_REFRESH_KEY = 'platform_refresh_token';

export const platformTokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(PLATFORM_ACCESS_KEY);
  },

  getRefresh(): string | null {
    return localStorage.getItem(PLATFORM_REFRESH_KEY);
  },

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(PLATFORM_ACCESS_KEY, access);
    localStorage.setItem(PLATFORM_REFRESH_KEY, refresh);
  },

  clear(): void {
    localStorage.removeItem(PLATFORM_ACCESS_KEY);
    localStorage.removeItem(PLATFORM_REFRESH_KEY);
  },
};
