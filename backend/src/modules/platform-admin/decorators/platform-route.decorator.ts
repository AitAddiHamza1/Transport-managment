import { SetMetadata } from '@nestjs/common';

export const IS_PLATFORM_ROUTE_KEY = 'isPlatformRoute';

/**
 * Décorateur explicite pour marquer les contrôleurs / routes d'administration plateforme.
 * Permet aux guards globaux de tenant (JwtAuthGuard, RolesGuard, PermissionsGuard)
 * de savoir de manière explicite et basée sur les métadonnées (sans matching d'URL)
 * qu'il s'agit d'une route d'administration plateforme.
 */
export const PlatformRoute = () => SetMetadata(IS_PLATFORM_ROUTE_KEY, true);
