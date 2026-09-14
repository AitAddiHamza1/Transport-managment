export interface NotificationItemView {
  id: number;
  notificationId: number;
  companyId: number;
  type: string;
  titre: string;
  message: string;
  priorite: string;
  entityType: string | null;
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
