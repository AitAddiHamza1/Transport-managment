export type NotificationType =
  | 'PAYMENT_DUE'
  | 'RECEIVABLE_DUE'
  | 'DOCUMENT_EXPIRATION'
  | 'TRIP_ALERT';

export type NotificationPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationEntityType =
  | 'DETTE_FOURNISSEUR'
  | 'CREANCE_CLIENT'
  | 'DOCUMENT_VEHICULE'
  | 'DOCUMENT_EMPLOYE'
  | 'VOYAGE';

export interface NotificationItemView {
  id: number;
  notificationId: number;
  companyId: number;
  type: NotificationType | string;
  titre: string;
  message: string;
  priorite: NotificationPriority | string;
  entityType: NotificationEntityType | string | null;
  entityId: number | null;
  targetRoute: string | null;
  dedupKey: string | null;
  creeLe: string;
  lu: boolean;
  luLe: string | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface QueryNotificationParams {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
}

export interface PaginatedResultMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedNotificationsResponse {
  data: NotificationItemView[];
  meta: PaginatedResultMeta;
}
