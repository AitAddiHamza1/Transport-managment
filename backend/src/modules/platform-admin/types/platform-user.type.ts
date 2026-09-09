export interface AuthenticatedPlatformAdmin {
  sub: number;
  email: string;
  nom: string;
  statut: string;
  mustChangePassword: boolean;
  type: 'PLATFORM_ADMIN';
}

export interface PlatformJwtPayload {
  sub: number;
  email: string;
  type: 'PLATFORM_ADMIN';
}

export interface PlatformRefreshPayload {
  sub: number;
  jti: string;
  type: 'PLATFORM_REFRESH';
}
