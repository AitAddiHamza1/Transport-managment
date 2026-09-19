import React from 'react';
import { Box, Grid, Skeleton, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { DashboardOverviewResponse } from '../../features/dashboard/types';
import { StatCard } from '../../components/shared/cards/StatCard';

interface DashboardKpiGridProps {
  data?: DashboardOverviewResponse;
  isLoading: boolean;
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Box mb={3}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          Situation financière
        </Typography>
        <Grid container spacing={2} mb={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={84} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          Situation opérationnelle
        </Typography>
        <Grid container spacing={2} mb={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} md={4} key={i}>
              <Skeleton variant="rounded" height={84} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data) return null;

  const currency = data.company.currency || 'MAD';

  // Financial KPIs
  const financialKpis = [];

  if (data.visibility.paiementsClients && data.financial.clientReceipts !== null) {
    financialKpis.push({
      id: 'kpi-receipts',
      label: 'Encaissements',
      value: `${Number(data.financial.clientReceipts).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      helperText: 'Paiements clients reçus',
      icon: <TrendingUpIcon />,
      iconBgColor: 'success.light',
      valueColor: 'success.main',
    });
  }

  if (data.financial.totalOutflow !== null) {
    financialKpis.push({
      id: 'kpi-outflow',
      label: 'Décaissements',
      value: `${Number(data.financial.totalOutflow).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      helperText: 'Dépenses & paiements réalisés',
      icon: <TrendingDownIcon />,
      iconBgColor: 'warning.light',
      valueColor: 'warning.main',
    });
  }

  if (data.financial.netCashFlow !== null) {
    const netVal = Number(data.financial.netCashFlow);
    const isPos = netVal >= 0;
    financialKpis.push({
      id: 'kpi-net',
      label: 'Solde net',
      value: `${netVal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      helperText: 'Encaissements − Décaissements',
      icon: <AccountBalanceWalletIcon />,
      iconBgColor: isPos ? 'success.light' : 'error.light',
      valueColor: isPos ? 'success.main' : 'error.main',
    });
  }

  if (data.visibility.factures && data.financial.totalInvoiced !== null) {
    financialKpis.push({
      id: 'kpi-invoiced',
      label: 'Facturé',
      value: `${Number(data.financial.totalInvoiced).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      helperText: 'Chiffre d’affaires émises',
      icon: <ReceiptIcon />,
      iconBgColor: 'info.light',
      valueColor: 'info.main',
    });
  }

  // Operational KPIs
  const operationalKpis = [];

  if (data.visibility.factures && data.financial.outstandingAmount !== null) {
    operationalKpis.push({
      id: 'kpi-outstanding',
      label: 'Reste à encaisser',
      value: `${Number(data.financial.outstandingAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      helperText: 'Solde factures non réglées',
      icon: <PendingActionsIcon />,
      iconBgColor: 'warning.light',
      valueColor: 'warning.main',
    });
  }

  if (data.visibility.voyages && data.operations.tripsCompleted !== null) {
    operationalKpis.push({
      id: 'kpi-trips',
      label: 'Voyages réalisés',
      value: `${data.operations.tripsCompleted}`,
      helperText: 'Voyages livrés ou facturés',
      icon: <LocalShippingIcon />,
      iconBgColor: 'primary.light',
    });
  }

  if (data.visibility.vehicules && data.operations.activeVehicles !== null) {
    operationalKpis.push({
      id: 'kpi-vehicles',
      label: 'Flotte active',
      value: `${data.operations.activeVehicles}`,
      helperText: 'Véhicules dispo. ou en voyage',
      icon: <DirectionsCarIcon />,
      iconBgColor: 'primary.light',
    });
  }

  return (
    <Box mb={3}>
      {/* 1. Situation Financière */}
      {financialKpis.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1.5, fontSize: '1.05rem' }}>
            Situation financière
          </Typography>
          <Grid container spacing={2}>
            {financialKpis.map((kpi) => (
              <Grid item xs={12} sm={6} md={3} key={kpi.id}>
                <StatCard
                  label={kpi.label}
                  value={kpi.value}
                  helperText={kpi.helperText}
                  icon={kpi.icon}
                  iconBgColor={kpi.iconBgColor}
                  valueColor={kpi.valueColor}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* 2. Situation Opérationnelle */}
      {operationalKpis.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1.5, fontSize: '1.05rem' }}>
            Situation opérationnelle
          </Typography>
          <Grid container spacing={2}>
            {operationalKpis.map((kpi) => (
              <Grid item xs={12} sm={6} md={4} key={kpi.id}>
                <StatCard
                  label={kpi.label}
                  value={kpi.value}
                  helperText={kpi.helperText}
                  icon={kpi.icon}
                  iconBgColor={kpi.iconBgColor}
                  valueColor={kpi.valueColor}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};
