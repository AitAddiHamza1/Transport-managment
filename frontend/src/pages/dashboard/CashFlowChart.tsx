import React from 'react';
import { Box, Card, CardContent, CardHeader, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { DashboardChartsResponse } from '../../features/dashboard/types';

interface CashFlowChartProps {
  data?: DashboardChartsResponse['cashFlow'];
  currency: string;
  isLoading: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, currency, isLoading }) => {
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
        <CardHeader title="Flux de trésorerie mensuel" />
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Aucune donnée de trésorerie disponible.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => [Math.abs(Number(d.in)), Math.abs(Number(d.out)), Math.abs(Number(d.net))]),
    1000,
  );

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Flux de trésorerie (6 derniers mois)"
        subheader={`Encaissements vs Décaissements (${currency})`}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent>
        <Stack direction="row" spacing={3} justifyContent="center" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: theme.palette.success.main }} />
            <Typography variant="caption" color="text.secondary">Encaissements (+)</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: theme.palette.warning.main }} />
            <Typography variant="caption" color="text.secondary">Décaissements (−)</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: theme.palette.info.main }} />
            <Typography variant="caption" color="text.secondary">Solde positif (+)</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: theme.palette.error.main }} />
            <Typography variant="caption" color="text.secondary">Solde négatif (−)</Typography>
          </Stack>
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 180, pt: 2, px: 1 }}>
          {data.map((d) => {
            const netVal = Number(d.net);
            const inPct = Math.min((Number(d.in) / maxVal) * 100, 100);
            const outPct = Math.min((Number(d.out) / maxVal) * 100, 100);
            const netPct = Math.min((Math.abs(netVal) / maxVal) * 100, 100);
            const netColor =
              netVal > 0
                ? theme.palette.info.main
                : netVal < 0
                  ? theme.palette.error.main
                  : theme.palette.grey[400];

            return (
              <Stack key={d.period} alignItems="center" spacing={0.5} flex={1}>
                <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 140 }}>
                  {/* Encaissements Bar */}
                  <Box
                    title={`Encaissements: ${d.in} ${currency}`}
                    sx={{
                      width: 10,
                      height: `${Math.max(inPct, 4)}%`,
                      backgroundColor: theme.palette.success.main,
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  {/* Décaissements Bar */}
                  <Box
                    title={`Décaissements: ${d.out} ${currency}`}
                    sx={{
                      width: 10,
                      height: `${Math.max(outPct, 4)}%`,
                      backgroundColor: theme.palette.warning.main,
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  {/* Solde Net Bar */}
                  <Box
                    title={`Solde net: ${d.net} ${currency}`}
                    sx={{
                      width: 10,
                      height: `${Math.max(netPct, 4)}%`,
                      backgroundColor: netColor,
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {d.period.slice(5)}
                </Typography>
              </Stack>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};
