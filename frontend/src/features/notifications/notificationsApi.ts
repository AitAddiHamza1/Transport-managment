import { api } from '../../lib/axios';
import type {
  PaginatedNotificationsResponse,
  QueryNotificationParams,
  UnreadCountResponse,
} from './types';

export const notificationsApi = {
  getNotifications: async (
    params?: QueryNotificationParams,
  ): Promise<PaginatedNotificationsResponse> => {
    const response = await api.get<PaginatedNotificationsResponse>('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: number): Promise<{ message: string }> => {
    const response = await api.patch<{ message: string }>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ count: number; message: string }> => {
    const response = await api.patch<{ count: number; message: string }>('/notifications/read-all');
    return response.data;
  },

  dismissNotification: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/notifications/${id}`);
    return response.data;
  },
};
