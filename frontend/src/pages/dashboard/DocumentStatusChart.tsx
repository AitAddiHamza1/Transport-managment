import React from 'react';
import { Box, Card, CardContent, CardHeader, LinearProgress, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { DashboardChartsResponse } from '../../features/dashboard/types';

interface DocumentStatusChartProps {
  data?: DashboardChartsResponse['documentsByStatus'];
  isLoading: boolean;
}

export const DocumentStatusChart: React.FC<DocumentStatusChartProps> = ({ data, isLoading }) => {
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
        <CardHeader title="Santé des documents véhicules" />
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Aucun document véhicule enregistré.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const totalDocs = data.reduce((acc, curr) => acc + curr.count, 0);

  const getDocColor = (status: string) => {
    switch (status) {
      case 'VALIDE':
        return theme.palette.success.main;
      case 'BIENTOT_EXPIRE':
        return theme.palette.warning.main;
      case 'EXPIRE':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Santé des documents véhicules"
        subheader={`Total : ${totalDocs} document(s)`}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {data.map((item) => {
            const pct = totalDocs > 0 ? Math.round((item.count / totalDocs) * 100) : 0;
            const barColor = getDocColor(item.status);

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
