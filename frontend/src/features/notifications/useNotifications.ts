import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './notificationsApi';
import type { QueryNotificationParams } from './types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];
export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'];

export function useUnreadCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60000,
    enabled: options?.enabled ?? true,
  });
}

export function useNotificationsList(
  params?: QueryNotificationParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'list', params],
    queryFn: () => notificationsApi.getNotifications(params),
    enabled: options?.enabled ?? true,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
        refetchType: 'all',
      });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
        refetchType: 'all',
      });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.dismissNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
        refetchType: 'all',
      });
    },
  });
}
