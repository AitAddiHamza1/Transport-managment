import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import PaidIcon from '@mui/icons-material/Paid';
import DescriptionIcon from '@mui/icons-material/Description';
import RouteIcon from '@mui/icons-material/Route';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { NotificationItemView } from '../../features/notifications/types';

interface NotificationItemProps {
  notification: NotificationItemView;
  onClick: () => void;
  onDismiss?: () => void;
}

export function formatNotificationTime(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR');
}

export function getTypeIcon(type: string) {
  switch (type) {
    case 'PAYMENT_DUE':
      return <MoneyOffIcon fontSize="small" />;
    case 'RECEIVABLE_DUE':
      return <PaidIcon fontSize="small" />;
    case 'DOCUMENT_EXPIRATION':
      return <DescriptionIcon fontSize="small" />;
    case 'TRIP_ALERT':
      return <RouteIcon fontSize="small" />;
    default:
      return <NotificationsIcon fontSize="small" />;
  }
}

export function getPriorityChip(priority: string) {
  switch (priority) {
    case 'URGENT':
      return <Chip label="Urgent" size="small" color="error" sx={{ height: 20, fontSize: '0.675rem' }} />;
    case 'HIGH':
      return <Chip label="Important" size="small" color="warning" sx={{ height: 20, fontSize: '0.675rem' }} />;
    case 'NORMAL':
    default:
      return null;
  }
}

export function getAvatarColor(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'error.main';
    case 'HIGH':
      return 'warning.main';
    case 'NORMAL':
    default:
      return 'info.main';
  }
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onDismiss,
}) => {
  const isUnread = !notification.lu;

  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        py: 1.5,
        px: 2,
        alignItems: 'flex-start',
        bgcolor: isUnread ? 'action.hover' : 'transparent',
        borderLeft: (theme) =>
          isUnread ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
        '&:hover': {
          bgcolor: isUnread ? 'action.selected' : 'action.hover',
        },
      }}
    >
      <Avatar
        sx={{
          bgcolor: getAvatarColor(notification.priorite),
          color: 'white',
          width: 36,
          height: 36,
          mr: 1.5,
          mt: 0.5,
        }}
      >
        {getTypeIcon(notification.type)}
      </Avatar>

      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: isUnread ? 700 : 500,
                color: 'text.primary',
                fontSize: '0.875rem',
              }}
            >
              {notification.titre}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {getPriorityChip(notification.priorite)}
              {onDismiss && (
                <Tooltip title="Masquer la notification">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss();
                    }}
                    aria-label="Masquer la notification"
                    sx={{ color: 'text.secondary', p: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8125rem',
                lineHeight: 1.4,
                mb: 0.5,
              }}
            >
              {notification.message}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                {formatNotificationTime(notification.creeLe)}
              </Typography>
              {isUnread && (
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'inline-block',
                  }}
                />
              )}
            </Stack>
          </Box>
        }
      />
    </ListItemButton>
  );
};
