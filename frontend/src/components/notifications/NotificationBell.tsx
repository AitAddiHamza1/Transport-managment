import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  Paper,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import {
  useDismissNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotificationsList,
  useUnreadCount,
} from '../../features/notifications/useNotifications';
import { resolveSafeNotificationRoute } from '../../features/notifications/resolveNotificationRoute';
import { NotificationItem } from './NotificationItem';
import type { NotificationItemView } from '../../features/notifications/types';

export function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const { data: unreadData, isLoading: isUnreadLoading, isError: isUnreadError } = useUnreadCount();
  const unreadCount = !isUnreadLoading && !isUnreadError && unreadData?.unreadCount ? unreadData.unreadCount : 0;

  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useNotificationsList({ limit: 5 }, { enabled: open });

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (notification: NotificationItemView) => {
    // 1. Mark as read using recipient entry ID (notification.id)
    if (!notification.lu) {
      markAsReadMutation.mutate(notification.id);
    }

    // 2. Safe navigation if valid internal ERP target exists
    const safeRoute = resolveSafeNotificationRoute(
      notification.entityType,
      notification.entityId,
    );
    if (safeRoute) {
      navigate(safeRoute);
    }

    // 3. Close popover dropdown
    handleClose();
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const ariaLabel =
    unreadCount === 0
      ? 'Centre de notifications'
      : unreadCount === 1
        ? 'Centre de notifications, 1 notification non lue'
        : `Centre de notifications, ${unreadCount} notifications non lues`;

  const notifications = listData?.data || [];

  return (
    <>
      <Tooltip title={ariaLabel} arrow>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label={ariaLabel}
          aria-haspopup="true"
          aria-expanded={open}
          sx={{ mr: 1 }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            invisible={unreadCount === 0}
          >
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          elevation: 4,
          sx: {
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            maxWidth: 400,
            maxHeight: 480,
            borderRadius: 2,
            overflow: 'hidden',
            mt: 1,
          },
        }}
      >
        <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Popover Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<DoneAllIcon fontSize="small" />}
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                sx={{ fontSize: '0.75rem', textTransform: 'none' }}
              >
                Tout marquer comme lu
              </Button>
            )}
          </Stack>

          <Divider />

          {/* Popover Content */}
          <Box sx={{ overflowY: 'auto', flexGrow: 1, maxHeight: 380 }}>
            {isListLoading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                <CircularProgress size={28} />
              </Stack>
            ) : isListError ? (
              <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 4, px: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="error.main">
                  Impossible de charger les notifications.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon fontSize="small" />}
                  onClick={() => refetchList()}
                >
                  Réessayer
                </Button>
              </Stack>
            ) : notifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Aucune notification
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                  Vous n'avez aucune notification pour le moment.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {notifications.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <NotificationItem
                      notification={item}
                      onClick={() => handleItemClick(item)}
                    />
                    {idx < notifications.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
          <Divider />
          <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Button
              size="small"
              fullWidth
              onClick={() => {
                handleClose();
                navigate('/notifications');
              }}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Voir toutes les notifications
            </Button>
          </Box>
        </Paper>
      </Popover>
    </>
  );
}
