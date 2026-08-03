import React from 'react';
import { Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { DashboardOverviewResponse } from '../../features/dashboard/types';

interface DashboardKpiGridProps {
  data?: DashboardOverviewResponse;
  isLoading: boolean;
}

interface KpiCardConfig {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  tone: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'primary';
  icon: React.ReactNode;
  isCurrency?: boolean;
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Grid container spacing={2} mb={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="80%" height={40} sx={{ my: 1 }} />
                <Skeleton variant="text" width="40%" height={20} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!data) return null;

  const currency = data.company.currency || 'MAD';
  const kpis: KpiCardConfig[] = [];

  // 1. Encaissements clients (Period)
  if (data.visibility.paiementsClients && data.financial.clientReceipts !== null) {
    kpis.push({
      id: 'kpi-receipts',
      title: 'Encaissements (Période)',
      value: `${Number(data.financial.clientReceipts).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      subtitle: 'Paiements clients reçus',
      tone: 'success',
      icon: <TrendingUpIcon color="success" fontSize="large" />,
    });
  }

  // 2. Total décaissements (Period)
  if (data.financial.totalOutflow !== null) {
    kpis.push({
      id: 'kpi-outflow',
      title: 'Décaissements (Période)',
      value: `${Number(data.financial.totalOutflow).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      subtitle: 'Dépenses & paiements réalisés',
      tone: 'warning',
      icon: <TrendingDownIcon color="warning" fontSize="large" />,
    });
  }

  // 3. Solde net (Period)
  if (data.financial.netCashFlow !== null) {
    const netVal = Number(data.financial.netCashFlow);
    const tone = netVal > 0 ? 'success' : netVal < 0 ? 'error' : 'info';
    kpis.push({
      id: 'kpi-net',
      title: 'Solde net (Période)',
      value: `${netVal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      subtitle: 'Encaissements − Décaissements',
      tone,
      icon: <AccountBalanceWalletIcon color={tone} fontSize="large" />,
    });
  }

  // 4. Chiffre d'affaires facturé (Period)
  if (data.visibility.factures && data.financial.totalInvoiced !== null) {
    kpis.push({
      id: 'kpi-invoiced',
      title: 'Facturé (Période)',
      value: `${Number(data.financial.totalInvoiced).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      subtitle: 'Chiffre d’affaires émises',
      tone: 'info',
      icon: <ReceiptIcon color="info" fontSize="large" />,
    });
  }

  // 5. Montant restant à encaisser (Current-state snapshot)
  if (data.visibility.factures && data.financial.outstandingAmount !== null) {
    kpis.push({
      id: 'kpi-outstanding',
      title: 'Reste à encaisser (Actuel)',
      value: `${Number(data.financial.outstandingAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
      subtitle: 'Solde factures non réglées',
      tone: 'warning',
      icon: <PendingActionsIcon color="warning" fontSize="large" />,
    });
  }

  // 6. Voyages réalisés (Period)
  if (data.visibility.voyages && data.operations.tripsCompleted !== null) {
    kpis.push({
      id: 'kpi-trips',
      title: 'Voyages réalisés (Période)',
      value: `${data.operations.tripsCompleted}`,
      subtitle: 'Voyages livrés ou facturés',
      tone: 'secondary',
      icon: <LocalShippingIcon color="secondary" fontSize="large" />,
    });
  }

  // 7. Flotte active (Current-state snapshot)
  if (data.visibility.vehicules && data.operations.activeVehicles !== null) {
    kpis.push({
      id: 'kpi-vehicles',
      title: 'Flotte active (Actuel)',
      value: `${data.operations.activeVehicles}`,
      subtitle: 'Véhicules dispo. ou en voyage',
      tone: 'primary',
      icon: <DirectionsCarIcon color="primary" fontSize="large" />,
    });
  }

  return (
    <Grid container spacing={2} mb={3}>
      {kpis.map((kpi) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={kpi.id}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 2,
              },
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {kpi.title}
                </Typography>
                {kpi.icon}
              </Stack>
              <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ my: 0.5 }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kpi.subtitle}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
