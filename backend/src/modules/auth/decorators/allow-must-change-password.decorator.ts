import { SetMetadata } from '@nestjs/common';

export const ALLOW_MUST_CHANGE_PASSWORD_KEY = 'allowMustChangePassword';

/**
 * Permet à une route protégée d'être exécutée même si l'utilisateur a mustChangePassword = true.
 * Utilisé principalement sur POST /auth/change-password et GET /auth/me.
 */
export const AllowMustChangePassword = () => SetMetadata(ALLOW_MUST_CHANGE_PASSWORD_KEY, true);
