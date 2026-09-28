/**
 * Pure utility to resolve a safe, verified internal ERP route from notification entity attributes.
 * Prevents trusting untrusted/arbitrary external route strings.
 */
export function resolveSafeNotificationRoute(
  entityType?: string | null,
  entityId?: number | null,
): string | null {
  if (!entityType) return null;

  const query = entityId ? `?highlightId=${entityId}` : '';

  switch (entityType) {
    case 'DETTE_FOURNISSEUR':
      return `/dettes-fournisseurs${query}`;
    case 'CREANCE_CLIENT':
      return `/factures${query}`;
    case 'DOCUMENT_VEHICULE':
      return `/vehicules/documents${query}`;
    case 'DOCUMENT_EMPLOYE':
      return `/employes${query}`;
    case 'VOYAGE':
      return `/voyages${query}`;
    default:
      return null;
  }
}
