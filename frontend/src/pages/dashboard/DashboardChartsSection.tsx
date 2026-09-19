import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { CashFlowChart } from './CashFlowChart';
import { TripsStatusChart } from './TripsStatusChart';
import { ExpenseBreakdownChart } from './ExpenseBreakdownChart';
import { DocumentStatusChart } from './DocumentStatusChart';
import { DashboardChartsResponse } from '../../features/dashboard/types';

interface DashboardChartsSectionProps {
  data?: DashboardChartsResponse;
  currency: string;
  isLoading: boolean;
}

export const DashboardChartsSection: React.FC<DashboardChartsSectionProps> = ({
  data,
  currency,
  isLoading,
}) => {
  return (
    <Box mb={3}>
      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1.5, fontSize: '1.05rem' }}>
        Analyse
      </Typography>
      <Grid container spacing={2.5}>
        {/* Row 1 Left: Flux de trésorerie */}
        <Grid item xs={12} md={6}>
          <CashFlowChart data={data?.cashFlow} currency={currency} isLoading={isLoading} />
        </Grid>

        {/* Row 1 Right: Voyages par statut */}
        <Grid item xs={12} md={6}>
          <TripsStatusChart data={data?.tripsByStatus} isLoading={isLoading} />
        </Grid>

        {/* Row 2 Left: Répartition des décaissements */}
        <Grid item xs={12} md={6}>
          <ExpenseBreakdownChart data={data?.expensesBySource} currency={currency} isLoading={isLoading} />
        </Grid>

        {/* Row 2 Right: Santé des documents véhicules */}
        <Grid item xs={12} md={6}>
          <DocumentStatusChart data={data?.documentsByStatus} isLoading={isLoading} />
        </Grid>
      </Grid>
    </Box>
  );
};
