import React from 'react';
import { Box, Card, CardContent, CardHeader, LinearProgress, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { DashboardChartsResponse } from '../../features/dashboard/types';

interface TripsStatusChartProps {
  data?: DashboardChartsResponse['tripsByStatus'];
  isLoading: boolean;
}

export const TripsStatusChart: React.FC<TripsStatusChartProps> = ({ data, isLoading }) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: 350 }}>
        <CardHeader title={<Skeleton width="40%" height={28} />} />
        <CardContent>
          <Skeleton variant="rectangular" height={220} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: 350 }}>
        <CardHeader title="Voyages par statut" />
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Aucune donnée de voyage disponible.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const totalTrips = data.reduce((acc, curr) => acc + curr.count, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANIFIE':
        return theme.palette.info.main;
      case 'EN_COURS':
        return theme.palette.warning.main;
      case 'LIVRE':
        return theme.palette.success.main;
      case 'FACTURE':
        return theme.palette.primary.main;
      case 'ANNULE':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Voyages par statut"
        subheader={`Total : ${totalTrips} voyage(s)`}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {data.map((item) => {
            const pct = totalTrips > 0 ? Math.round((item.count / totalTrips) * 100) : 0;
            const barColor = getStatusColor(item.status);

            return (
              <Box key={item.status}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={500}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {item.count} ({pct}%)
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.palette.action.hover,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: barColor,
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
