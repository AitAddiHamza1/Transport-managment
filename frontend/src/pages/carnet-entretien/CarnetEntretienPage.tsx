import {
  Avatar,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AppPagination,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';

import { useCarnetInterventions } from '../../features/carnet-entretien/useCarnetEntretien';
import {
  MaintenanceIntervention,
  MaintenanceStatus,
  QueryCarnetEntretienParams,
} from '../../features/carnet-entretien/types';

import { CarnetEntretienMobileList } from './CarnetEntretienMobileList';
import { InterventionDetailDialog } from './InterventionDetailDialog';
import { vehiclesApi } from '../../features/vehicles/vehiclesApi';
import { Vehicule } from '../../features/vehicles/types';

const STATUS_MAP: Record<MaintenanceStatus, { label: string; chipVariant: 'success' | 'warning' | 'error' | 'default' }> = {
  OK: { label: 'OK', chipVariant: 'success' },
  UPCOMING: { label: 'À venir', chipVariant: 'warning' },
  DUE: { label: 'Échéance', chipVariant: 'warning' },
  OVERDUE: { label: 'En retard', chipVariant: 'error' },
};

export function CarnetEntretienPage() {
  const navigate = useNavigate();

  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [preset, setPreset] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Auxiliary data
  const [vehicles, setVehicles] = useState<Vehicule[]>([]);

  // Dialog state
  const [detailIntervention, setDetailIntervention] = useState<MaintenanceIntervention | null>(null);

  // Load vehicles list
  useEffect(() => {
    vehiclesApi
      .getAll({ limit: 100 })
      .then((res) => setVehicles(res.data || []))
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Compute period dates if quick preset is selected
  const computedDateRange = useMemo(() => {
    if (preset === 'PERSONNALISE') {
      return { from: dateFrom || undefined, to: dateTo || undefined };
    }
    if (preset === 'ALL') {
      return { from: undefined, to: undefined };
    }

    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    if (preset === 'CE_MOIS') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'CE_TRIMESTRE') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), quarterMonth, 1);
      to = new Date(now.getFullYear(), quarterMonth + 3, 0);
    } else if (preset === 'CETTE_ANNEE') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }

    return {
      from: from ? from.toISOString().substring(0, 10) : undefined,
      to: to ? to.toISOString().substring(0, 10) : undefined,
    };
  }, [preset, dateFrom, dateTo]);

  // Query parameters
  const queryParams = useMemo<QueryCarnetEntretienParams>(() => {
    return {
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch.trim() || undefined,
      immatriculation: vehicleFilter !== 'ALL' ? vehicleFilter : undefined,
      statut: statusFilter !== 'ALL' ? (statusFilter as MaintenanceStatus) : undefined,
      dateFrom: computedDateRange.from,
      dateTo: computedDateRange.to,
    };
  }, [page, rowsPerPage, debouncedSearch, vehicleFilter, statusFilter, computedDateRange]);

  // React Query hook
  const { data, isLoading, isError, error } = useCarnetInterventions(queryParams);

  const interventions = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Calculate top KPI stats derived from real returned backend data
  const kpiStats = useMemo(() => {
    let upcomingCount = 0;
    let dueCount = 0;
    let overdueCount = 0;
    const trackedVehicles = new Set<string>();

    interventions.forEach((item) => {
      trackedVehicles.add(item.immatriculation);
      if (item.statut === 'UPCOMING') upcomingCount++;
      if (item.statut === 'DUE') dueCount++;
      if (item.statut === 'OVERDUE') overdueCount++;
    });

    return {
      upcomingCount,
      dueCount,
      overdueCount,
      trackedVehiclesCount: trackedVehicles.size || (vehicles.length > 0 ? vehicles.length : 0),
    };
  }, [interventions, vehicles]);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      vehicleFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      preset !== 'ALL',
  );

  // Auto page correction
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setVehicleFilter('ALL');
    setStatusFilter('ALL');
    setPreset('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Page Header (Strictly consultation mode) */}
      <PageHeader
        title="Carnet d'entretien"
        subtitle="Suivi des interventions et des échéances de maintenance."
        hideBreadcrumbs
      />

      {/* Top KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Entretiens à venir"
          value={String(kpiStats.upcomingCount)}
          icon={<ScheduleIcon />}
          iconBgColor="warning.light"
          valueColor="warning.main"
        />

        <StatCard
          label="Échéances proches"
          value={String(kpiStats.dueCount)}
          icon={<WarningAmberIcon />}
          iconBgColor="amber.light"
          valueColor="warning.dark"
        />

        <StatCard
          label="Entretiens en retard"
          value={String(kpiStats.overdueCount)}
          icon={<ErrorOutlineIcon />}
          iconBgColor="error.light"
          valueColor="error.main"
        />

        <StatCard
          label="Véhicules suivis"
          value={String(kpiStats.trackedVehiclesCount)}
          icon={<LocalShippingIcon />}
          iconBgColor="primary.light"
          valueColor="primary.main"
        />
      </Box>

      {/* Main List Toolbar */}
      <Box sx={{ mb: 2 }}>
        <ListToolbar
          searchField={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un entretien ou un véhicule..."
            />
          }
          onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
        >
          {/* Filter: Véhicule */}
          <TextField
            select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setPage(0);
            }}
            label="Véhicule"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 160 }}
          >
            <option value="ALL">Tous les véhicules</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.immatriculation}>
                {v.immatriculation}
              </option>
            ))}
          </TextField>

          {/* Filter: Statut */}
          <TextField
            select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            label="Statut"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 140 }}
          >
            <option value="ALL">Tous</option>
            <option value="UPCOMING">À venir</option>
            <option value="DUE">Échéance</option>
            <option value="OVERDUE">En retard</option>
          </TextField>

          {/* Filter: Period preset */}
          <TextField
            select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setPage(0);
            }}
            label="Période"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 150 }}
          >
            <option value="ALL">Toutes les dates</option>
            <option value="CE_MOIS">Ce mois</option>
            <option value="CE_TRIMESTRE">Ce trimestre</option>
            <option value="CETTE_ANNEE">Cette année</option>
            <option value="PERSONNALISE">Personnalisé</option>
          </TextField>

          {preset === 'PERSONNALISE' && (
            <>
              <TextField
                type="date"
                label="Date de début"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 140 }}
              />
              <TextField
                type="date"
                label="Date de fin"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 140 }}
              />
            </>
          )}
        </ListToolbar>
      </Box>

      {/* Loading Progress */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error State */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Impossible de charger le carnet d’entretien.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Main Table */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell density="dense">
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell>Véhicule</TableCell>
                <TableCell>Intervention</TableCell>
                <TableCell>Date intervention</TableCell>
                <TableCell align="right">Kilométrage intervention</TableCell>
                <TableCell align="right">Kilométrage actuel</TableCell>
                <TableCell align="right">Prochaine échéance</TableCell>
                <TableCell align="right">Reste</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interventions.length > 0 ? (
                interventions.map((item) => {
                  const statusCfg = STATUS_MAP[item.statut] || { label: item.statut, chipVariant: 'default' };

                  const remainingText =
                    item.remainingKm !== null && item.remainingKm !== undefined
                      ? item.remainingKm < 0
                        ? `${Math.abs(item.remainingKm).toLocaleString('fr-FR')} km de retard`
                        : `${item.remainingKm.toLocaleString('fr-FR')} km restants`
                      : '—';

                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setDetailIntervention(item)}
                    >
                      {/* 1. Véhicule */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {item.immatriculation}
                        </Typography>
                      </TableCell>

                      {/* 2. Intervention */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.libelle}
                        </Typography>
                      </TableCell>

                      {/* 3. Date intervention */}
                      <TableCell>
                        <Typography variant="body2">{item.dateIntervention}</Typography>
                      </TableCell>

                      {/* 4. Kilométrage intervention */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {item.kilometrageRealise.toLocaleString('fr-FR')} km
                        </Typography>
                      </TableCell>

                      {/* 5. Kilométrage actuel */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>
                          {item.currentVehicleMileage !== null
                            ? `${item.currentVehicleMileage.toLocaleString('fr-FR')} km`
                            : '—'}
                        </Typography>
                      </TableCell>

                      {/* 6. Prochaine échéance */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {item.prochainKmEcheance !== null
                            ? `${item.prochainKmEcheance.toLocaleString('fr-FR')} km`
                            : '—'}
                        </Typography>
                      </TableCell>

                      {/* 7. Reste */}
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={
                            item.remainingKm !== null && item.remainingKm < 0
                              ? 'error.main'
                              : item.remainingKm !== null && item.remainingKm <= 1000
                              ? 'warning.main'
                              : 'success.main'
                          }
                        >
                          {remainingText}
                        </Typography>
                      </TableCell>

                      {/* 8. Statut */}
                      <TableCell>
                        <StatusChip label={statusCfg.label} variant={statusCfg.chipVariant} />
                      </TableCell>

                      {/* 9. Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Voir le détail">
                            <IconButton size="small" color="info" onClick={() => setDetailIntervention(item)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    {hasActiveFilters ? (
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                          <SearchIcon fontSize="large" />
                        </Avatar>
                        <Box text-align="center">
                          <Typography variant="h6" fontWeight={600}>
                            Aucun entretien ne correspond aux filtres sélectionnés.
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FilterAltOffIcon />}
                          onClick={handleResetFilters}
                        >
                          Réinitialiser les filtres
                        </Button>
                      </Stack>
                    ) : (
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                          <BuildIcon fontSize="large" />
                        </Avatar>
                        <Box text-align="center">
                          <Typography variant="h6" fontWeight={600}>
                            Aucun entretien enregistré
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Aucune charge d'entretien n'a encore été enregistrée.
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/charges-vehicules')}
                        >
                          Créer une charge véhicule
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <AppPagination
            page={page + 1}
            pageSize={rowsPerPage}
            totalCount={meta.total}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(ps) => {
              setRowsPerPage(ps);
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </DataTableShell>
      </Box>

      {/* Mobile Card List */}
      <CarnetEntretienMobileList
        interventions={interventions}
        onView={(i) => setDetailIntervention(i)}
      />

      {/* Detail Dialog */}
      <InterventionDetailDialog
        open={detailIntervention !== null}
        intervention={detailIntervention}
        onClose={() => setDetailIntervention(null)}
      />
    </Box>
  );
}
