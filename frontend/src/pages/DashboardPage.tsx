import React, { useState } from 'react';
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { useAuth } from '../features/auth/useAuth';
import { DashboardPreset } from '../features/dashboard/types';
import {
  useDashboardAlerts,
  useDashboardCharts,
  useDashboardOverview,
  useDashboardRecentActivity,
} from '../features/dashboard/useDashboard';
import { DashboardPeriodFilter } from './dashboard/DashboardPeriodFilter';
import { DashboardKpiGrid } from './dashboard/DashboardKpiGrid';
import { DashboardEmptyPeriodState } from './dashboard/DashboardEmptyPeriodState';
import { DashboardChartsSection } from './dashboard/DashboardChartsSection';
import { DashboardAlerts } from './dashboard/DashboardAlerts';
import { DashboardRecentActivity } from './dashboard/DashboardRecentActivity';

export function DashboardPage() {
  const { user } = useAuth();

  const [preset, setPreset] = useState<DashboardPreset>('CE_MOIS');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');

  const isCustom = preset === 'PERSONNALISE';
  const isCustomIncomplete = isCustom && (!dateDebut || !dateFin);
  const isCustomInvalidRange = isCustom && Boolean(dateDebut && dateFin && dateDebut > dateFin);
  const isCustomValid = isCustom && Boolean(dateDebut && dateFin && dateDebut <= dateFin);

  const queryParams = {
    preset,
    ...(isCustomValid ? { dateDebut, dateFin } : {}),
  };

  const overviewQuery = useDashboardOverview(queryParams);
  const chartsQuery = useDashboardCharts(queryParams);
  const alertsQuery = useDashboardAlerts();
  const activityQuery = useDashboardRecentActivity(queryParams);

  const companyName = overviewQuery.data?.company?.name || 'Transport & Logistique';
  const currency = overviewQuery.data?.company?.currency || 'MAD';

  const handlePresetChange = (newPreset: DashboardPreset) => {
    setPreset(newPreset);
  };

  const handleCustomDatesChange = (start: string, end: string) => {
    setDateDebut(start);
    setDateFin(end);
  };

  const handleRefresh = () => {
    overviewQuery.refetch();
    chartsQuery.refetch();
    alertsQuery.refetch();
    activityQuery.refetch();
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Bonjour, {user?.nom || 'Hamza'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vue d’ensemble de {companyName}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={handleRefresh}
          sx={{ mt: { xs: 1, sm: 0 } }}
        >
          Actualiser
        </Button>
      </Box>

      {/* Partial Data Banner */}
      {overviewQuery.data?.metadata?.isPartial && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle sx={{ fontWeight: 600 }}>Données partielles selon vos autorisations</AlertTitle>
          Certains indicateurs et totaux financiers ont été masqués car votre profil ne possède pas les permissions requises sur l'ensemble des modules comptables.
        </Alert>
      )}

      {/* Period Selector */}
      <DashboardPeriodFilter
        preset={preset}
        dateDebut={dateDebut}
        dateFin={dateFin}
        onPresetChange={handlePresetChange}
        onCustomDatesChange={handleCustomDatesChange}
      />

      {isCustomIncomplete && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Sélectionnez une date de début et une date de fin.
        </Alert>
      )}

      {isCustomInvalidRange && (
        <Alert severity="error" sx={{ mb: 3 }}>
          La date de début doit être antérieure ou égale à la date de fin.
        </Alert>
      )}

      {/* Dynamic Reflowing KPI Grid */}
      <DashboardKpiGrid data={overviewQuery.data} isLoading={overviewQuery.isLoading} />

      {/* Contextual Empty State when period activity is zero */}
      {overviewQuery.data?.isPeriodEmpty && <DashboardEmptyPeriodState />}

      {/* 4 Exact Charts Section */}
      <DashboardChartsSection
        data={chartsQuery.data}
        currency={currency}
        isLoading={chartsQuery.isLoading}
      />

      {/* Actionable Alerts Panel */}
      <DashboardAlerts alerts={alertsQuery.data} isLoading={alertsQuery.isLoading} />

      {/* 20-Item Recent Activity Stream */}
      <DashboardRecentActivity
        activities={activityQuery.data}
        currency={currency}
        isLoading={activityQuery.isLoading}
      />
    </Box>
  );
}
