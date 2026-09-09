import React from 'react';
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { DashboardRecentActivityItem } from '../../features/dashboard/types';

interface DashboardRecentActivityProps {
  activities?: DashboardRecentActivityItem[];
  currency: string;
  isLoading: boolean;
}

export const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({
  activities,
  currency,
  isLoading,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardHeader title={<Skeleton width="40%" height={28} />} />
        <CardContent>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="text" height={40} sx={{ mb: 1 }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardHeader title="Activité récente" />
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Aucune activité récente enregistrée.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'invoice':
        return <ReceiptIcon />;
      case 'client_payment':
      case 'supplier_payment':
      case 'employee_payment':
        return <PaymentIcon />;
      case 'admin_expense':
        return <AccountBalanceIcon />;
      case 'trip':
        return <LocalShippingIcon />;
      case 'document':
        return <DescriptionIcon />;
      default:
        return <ReceiptIcon />;
    }
  };

  const formatRelativeTime = (isoDateStr: string, precision: 'DATETIME' | 'DATE') => {
    const d = new Date(isoDateStr);
    if (precision === 'DATE') {
      return d.toLocaleDateString('fr-FR');
    }

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return d.toLocaleDateString('fr-FR');
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardHeader
        title="Activité récente (20 derniers événements)"
        subheader="Flux chronologique des opérations"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <List disablePadding>
          {activities.map((item, idx) => {
            const cleanDesc = item.description
              ? String(item.description)
                  .replace(/null/gi, '')
                  .replace(/—\s*$/, '')
                  .replace(/Client:\s*$/, '')
                  .replace(/Fournisseur:\s*$/, '')
                  .trim()
              : '';

            return (
              <React.Fragment key={item.activityId}>
                <ListItem
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                  secondaryAction={
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(item.sourceRoute)}
                    >
                      Ouvrir
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: `${item.tone}.main`,
                        color: 'white',
                        width: 36,
                        height: 36,
                      }}
                    >
                      {getIcon(item.iconKey)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {item.title}
                        </Typography>
                        {item.amount && (
                          <Chip
                            label={`${Number(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`}
                            size="small"
                            color={item.tone as any}
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" alignItems="center" spacing={1} mt={0.2}>
                        {cleanDesc && (
                          <>
                            <Typography variant="body2" color="text.secondary" component="span">
                              {cleanDesc}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" component="span">
                              •
                            </Typography>
                          </>
                        )}
                        <Tooltip title={new Date(item.date).toLocaleString('fr-FR')}>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {formatRelativeTime(item.date, item.timestampPrecision)}
                          </Typography>
                        </Tooltip>
                      </Stack>
                    }
                  />
                </ListItem>
                {idx < activities.length - 1 && <Divider component="li" />}
              </React.Fragment>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};
