import React from 'react';
import { Grid } from '@mui/material';
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
    <Grid container spacing={3} mb={3}>
      {/* Chart 1: Cash Flow Trend */}
      <Grid item xs={12} md={6}>
        <CashFlowChart data={data?.cashFlow} currency={currency} isLoading={isLoading} />
      </Grid>

      {/* Chart 2: Trips by Status */}
      <Grid item xs={12} md={6}>
        <TripsStatusChart data={data?.tripsByStatus} isLoading={isLoading} />
      </Grid>

      {/* Chart 3: Outflow Expense Breakdown */}
      <Grid item xs={12} md={6}>
        <ExpenseBreakdownChart data={data?.expensesBySource} currency={currency} isLoading={isLoading} />
      </Grid>

      {/* Chart 4: Vehicle Document Health */}
      <Grid item xs={12} md={6}>
        <DocumentStatusChart data={data?.documentsByStatus} isLoading={isLoading} />
      </Grid>
    </Grid>
  );
};
