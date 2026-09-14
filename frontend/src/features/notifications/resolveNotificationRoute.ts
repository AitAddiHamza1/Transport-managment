/**
 * Pure utility to resolve a safe, verified internal ERP route from notification entity attributes.
 * Prevents trusting untrusted/arbitrary external route strings.
 */
export function resolveSafeNotificationRoute(
  entityType?: string | null,
  _entityId?: number | null,
): string | null {
  if (!entityType) return null;

  switch (entityType) {
    case 'DETTE_FOURNISSEUR':
      return '/dettes-fournisseurs';
    case 'CREANCE_CLIENT':
      return '/factures';
    case 'DOCUMENT_VEHICULE':
      return '/vehicules/documents';
    case 'DOCUMENT_EMPLOYE':
      return '/employes';
    case 'VOYAGE':
      return '/voyages';
    default:
      return null;
  }
}
