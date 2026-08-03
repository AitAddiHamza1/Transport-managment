import React from 'react';
import { Alert, AlertTitle, Button, Card, CardContent, CardHeader, Skeleton, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import { DashboardAlertItem } from '../../features/dashboard/types';

interface DashboardAlertsProps {
  alerts?: DashboardAlertItem[];
  isLoading: boolean;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ alerts, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardHeader title={<Skeleton width="30%" height={28} />} />
        <CardContent>
          <Skeleton variant="rectangular" height={80} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={80} />
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardHeader
          title="Alertes & Risques opérationnels"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        />
        <CardContent>
          <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="inherit" />}>
            Aucun risque ni alerte urgente détectée pour le moment. Votre flotte et vos dettes sont à jour.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
      <CardHeader
        title="Alertes & Risques opérationnels"
        subheader="Actions requises sur vos pièces et paiements"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent>
        <Stack spacing={2}>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.severity}
              action={
                <Button
                  color="inherit"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate(alert.targetRoute)}
                >
                  Voir les détails
                </Button>
              }
            >
              <AlertTitle sx={{ fontWeight: 700 }}>{alert.title}</AlertTitle>
              {alert.description}
            </Alert>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
