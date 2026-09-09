import React from 'react';
import { Box, Card, CardContent, CardHeader, LinearProgress, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { DashboardChartsResponse } from '../../features/dashboard/types';

interface ExpenseBreakdownChartProps {
  data?: DashboardChartsResponse['expensesBySource'];
  currency: string;
  isLoading: boolean;
}

export const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ data, currency, isLoading }) => {
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
        <CardHeader title="Répartition des décaissements" />
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Aucun décaissement enregistré pour la période.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const totalExpense = data.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const colors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
  ];

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title="Répartition des décaissements"
        subheader={`Total : ${totalExpense.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {data.map((item, idx) => {
            const amt = Number(item.amount);
            const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
            const barColor = colors[idx % colors.length];

            return (
              <Box key={item.source}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={500}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {amt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency} ({pct}%)
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
