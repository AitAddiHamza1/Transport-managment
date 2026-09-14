import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  List,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import {
  useDismissNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotificationsList,
  useUnreadCount,
} from '../../features/notifications/useNotifications';
import { resolveSafeNotificationRoute } from '../../features/notifications/resolveNotificationRoute';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import type { NotificationItemView } from '../../features/notifications/types';

export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [tabFilter, setTabFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unreadCount ?? 0;

  const isReadParam = tabFilter === 'UNREAD' ? false : tabFilter === 'READ' ? true : undefined;

  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useNotificationsList({
    page,
    limit: 20,
    isRead: isReadParam,
  });

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const dismissMutation = useDismissNotification();

  const handleItemClick = (notification: NotificationItemView) => {
    // 1. Mark read using recipient entry ID
    if (!notification.lu) {
      markAsReadMutation.mutate(notification.id);
    }

    // 2. Safe navigation if valid internal target route exists
    const safeRoute = resolveSafeNotificationRoute(
      notification.entityType,
      notification.entityId,
    );
    if (safeRoute) {
      navigate(safeRoute);
    }
  };

  const handleDismiss = (notification: NotificationItemView) => {
    dismissMutation.mutate(notification.id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'ALL' | 'UNREAD' | 'READ') => {
    setTabFilter(newValue);
    setPage(1);
  };

  const notifications = listData?.data || [];
  const meta = listData?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {/* Header */}
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <NotificationsIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Centre de notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} non lue(s)`}
                  color="error"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
          }
          subheader="Consultez et gérez vos alertes et notifications système"
          action={
            unreadCount > 0 ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                sx={{ textTransform: 'none' }}
              >
                Tout marquer comme lu
              </Button>
            ) : undefined
          }
          sx={{ pb: 1 }}
        />

        {/* Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabFilter} onChange={handleTabChange} aria-label="Filtres de notifications">
            <Tab label="Toutes" value="ALL" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab
              label={unreadCount > 0 ? `Non lues (${unreadCount})` : 'Non lues'}
              value="UNREAD"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab label="Lues" value="READ" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* Content */}
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" height={72} sx={{ mb: 1.5, borderRadius: 1 }} />
              ))}
            </Box>
          ) : isError ? (
            <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 6, px: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="error.main" fontWeight={500}>
                Impossible de charger les notifications.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
              >
                Réessayer
              </Button>
            </Stack>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
              <Typography variant="h6" color="text.secondary" fontWeight={500}>
                Aucune notification
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                {tabFilter === 'UNREAD'
                  ? 'Vous n’avez aucune notification non lue.'
                  : tabFilter === 'READ'
                    ? 'Vous n’avez aucune notification lue.'
                    : 'Vous n’avez aucune notification pour le moment.'}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <NotificationItem
                    notification={item}
                    onClick={() => handleItemClick(item)}
                    onDismiss={() => handleDismiss(item)}
                  />
                  {idx < notifications.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}

          {/* Pagination Controls */}
          {meta && totalPages > 1 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Affichage de {notifications.length} sur {meta.total} notification(s) — Page {meta.page} sur {totalPages}
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, val) => setPage(val)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Paper>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default NotificationsPage;
