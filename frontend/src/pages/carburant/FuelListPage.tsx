import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import OpacityIcon from '@mui/icons-material/Opacity';
import CalculateIcon from '@mui/icons-material/Calculate';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SpeedIcon from '@mui/icons-material/Speed';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader, StatCard } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useConsommationsGasoilQuery,
  useConsommationGasoilStats,
  useCreateConsommationGasoil,
  useDeleteConsommationGasoil,
  useUpdateConsommationGasoil,
} from '../../features/carburant/useCarburant';
import { BonCarburant, CreateBonCarburantPayload, ConsommationGasoilStatus } from '../../features/carburant/types';
import { carburantApi } from '../../features/carburant/carburantApi';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { notify } from '../../utils/notify';
import { FuelMobileList } from './FuelMobileList';
import { FuelFormDialog } from './FuelFormDialog';
import { FuelDetailDialog } from './FuelDetailDialog';

export function FuelListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [preset, setPreset] = useState<string>('CE_MOIS');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formBon, setFormBon] = useState<BonCarburant | null>(null);

  const [detailBonId, setDetailBonId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BonCarburant | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Lookups
  const { data: vehData } = useVehiclesQuery({ page: 1, limit: 100 });
  const vehicleList = useMemo(() => vehData?.data || [], [vehData]);

  // Query params
  const queryParams = useMemo(() => {
    return {
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      immatriculation: selectedVehicle !== 'ALL' ? selectedVehicle : undefined,
      preset: preset !== 'ALL' ? (preset as any) : undefined,
      dateFrom: preset === 'PERSONNALISE' && dateFrom ? dateFrom : undefined,
      dateTo: preset === 'PERSONNALISE' && dateTo ? dateTo : undefined,
      statut: statusFilter !== 'ALL' ? (statusFilter as ConsommationGasoilStatus) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedVehicle, preset, dateFrom, dateTo, statusFilter]);

  // Queries & Mutations
  const { data: statsData } = useConsommationGasoilStats(queryParams);
  const { data, isLoading, isError, error } = useConsommationsGasoilQuery(queryParams);

  const createMutation = useCreateConsommationGasoil();
  const updateMutation = useUpdateConsommationGasoil();
  const deleteMutation = useDeleteConsommationGasoil();

  const bons = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      (selectedVehicle && selectedVehicle !== 'ALL') ||
      (preset && preset !== 'ALL') ||
      (statusFilter && statusFilter !== 'ALL'),
  );

  // Page auto-correction on row deletion
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  // Reset filters handler
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedVehicle('ALL');
    setPreset('CE_MOIS');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('ALL');
    setPage(0);
  };

  // Handlers
  const handleOpenCreate = () => {
    setFormBon(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (bon: BonCarburant) => {
    setFormBon(bon);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: CreateBonCarburantPayload) => {
    if (formBon) {
      await updateMutation.mutateAsync({ id: formBon.idBon, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.idBon);
      setDeleteTarget(null);
    }
  };

  // Excel Export Handler
  const handleExcelExport = async () => {
    try {
      setIsExporting(true);
      const blob = await carburantApi.exportExcel(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `consommation-gasoil-${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success('Rapport Excel généré avec succès');
    } catch (err: any) {
      notify.error('Erreur lors de la génération de l’export Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Consommation gasoil & bons de carburant"
        subtitle="Suivi du kilométrage, de la consommation aux 100km et du coût moyen au km de la flotte"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Consommation gasoil', to: '/consommation-gasoil' },
          { label: 'Liste' },
        ]}
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Can module="bons_carburant" action="voir">
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FileDownloadIcon />}
                onClick={handleExcelExport}
                disabled={isExporting}
              >
                Exporter Excel
              </Button>
            </Can>
            <Can module="bons_carburant" action="ajouter">
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Nouveau bon
              </Button>
            </Can>
          </Stack>
        }
      />

      {/* Top 4 Authoritative Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Litres consommés"
            value={statsData?.litresTotal ? `${Number(statsData.litresTotal).toLocaleString('fr-FR')} L` : '0 L'}
            icon={<OpacityIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Consommation moyenne — L/100km"
            value={
              statsData?.consommationMoyenneL100
                ? `${Number(statsData.consommationMoyenneL100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} L/100km`
                : '—'
            }
            icon={<CalculateIcon />}
            iconBgColor="primary.light"
            valueColor="primary.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Coût total carburant"
            value={
              statsData?.coutTotal
                ? `${Number(statsData.coutTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                : '0,00 MAD'
            }
            icon={<AttachMoneyIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Coût moyen / km"
            value={
              statsData?.coutMoyenKm
                ? `${Number(statsData.coutMoyenKm).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD/km`
                : '—'
            }
            icon={<SpeedIcon />}
            iconBgColor="info.light"
            valueColor="info.main"
          />
        </Grid>
      </Grid>

      {/* Filters Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} md={3}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher N° Bon, immat, chauffeur..."
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Vehicle Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              value={selectedVehicle}
              onChange={(e) => {
                setSelectedVehicle(e.target.value);
                setPage(0);
              }}
              label="Filtrer par véhicule"
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="ALL">Tous les véhicules</option>
              {vehicleList.map((v) => (
                <option key={v.id} value={v.immatriculation}>
                  {v.immatriculation} ({v.marque})
                </option>
              ))}
            </TextField>
          </Grid>

          {/* Period Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                setPage(0);
              }}
              label="Période"
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="ALL">Toutes les périodes</option>
              <option value="AUJOURDHUI">Aujourd’hui</option>
              <option value="CE_MOIS">Ce mois</option>
              <option value="CE_TRIMESTRE">Ce trimestre</option>
              <option value="CETTE_ANNEE">Cette année</option>
              <option value="PERSONNALISE">Personnalisé</option>
            </TextField>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              label="Statut consommation"
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="STOCK_INITIAL">Stock initial</option>
              <option value="CALCULE">Calculé</option>
              <option value="NON_CALCULABLE">Non calculable</option>
            </TextField>
          </Grid>

          {/* Custom Date Range Picker when PERSONNALISE */}
          {preset === 'PERSONNALISE' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  type="date"
                  label="Date de début"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(0);
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  type="date"
                  label="Date de fin"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(0);
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Loading Progress */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des bons de carburant.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop 12-Column Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2, overflowX: 'auto' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>N° Bon</TableCell>
              <TableCell>Véhicule</TableCell>
              <TableCell>Chauffeur</TableCell>
              <TableCell align="right">Kilométrage</TableCell>
              <TableCell align="right">Litres (L)</TableCell>
              <TableCell align="right">Prix / L</TableCell>
              <TableCell align="right">Montant Total</TableCell>
              <TableCell align="right">Distance (km)</TableCell>
              <TableCell align="right">L/100km</TableCell>
              <TableCell align="right">Coût/km</TableCell>
              <TableCell align="center">Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bons.length > 0 ? (
              bons.map((bon) => {
                const driverName = bon.driverName || bon.nomConducteur || '—';
                const statusLabel =
                  bon.status === 'STOCK_INITIAL'
                    ? 'Stock initial'
                    : bon.status === 'CALCULE'
                      ? 'Calculé'
                      : 'Non calculable';

                const statusColor =
                  bon.status === 'STOCK_INITIAL'
                    ? 'info'
                    : bon.status === 'CALCULE'
                      ? 'success'
                      : 'default';

                return (
                  <TableRow key={bon.idBon} hover>
                    <TableCell>
                      <Typography variant="body2">{bon.dateCarburant}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {bon.numeroBon ? `#${bon.numeroBon}` : `#${bon.idBon}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {bon.immatriculation}
                      </Typography>
                    </TableCell>
                    <TableCell>{driverName}</TableCell>
                    <TableCell align="right">
                      {bon.kilometrage !== null ? `${bon.kilometrage.toLocaleString('fr-FR')} km` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={`${Number(bon.litres).toLocaleString('fr-FR')} L`} size="small" color="warning" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      {Number(bon.prixParLitre).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MAD
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {Number(bon.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {bon.distance !== null ? `+${bon.distance.toLocaleString('fr-FR')} km` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {bon.consommationL100 !== null ? (
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {bon.consommationL100} L/100
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {bon.coutKm !== null ? `${bon.coutKm} MAD` : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={statusLabel} size="small" color={statusColor as any} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter les détails">
                          <IconButton size="small" color="info" onClick={() => setDetailBonId(bon.idBon)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="bons_carburant" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(bon)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="bons_carburant" action="supprimer">
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(bon)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                  {hasActiveFilters ? (
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                        <SearchIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun résultat trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Aucun bon de carburant ne correspond aux critères sélectionnés.
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
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'warning.light', color: 'warning.main' }}>
                        <LocalGasStationIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucune consommation de gasoil enregistrée
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ajoutez votre premier bon de carburant pour commencer le suivi des coûts et kilométrages.
                        </Typography>
                      </Box>
                      <Can module="bons_carburant" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouveau bon
                        </Button>
                      </Can>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={meta.total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page :"
        />
      </TableContainer>

      {/* Mobile Card List */}
      <FuelMobileList
        bons={bons}
        onView={(bon) => setDetailBonId(bon.idBon)}
        onEdit={handleOpenEdit}
        onDelete={(bon) => setDeleteTarget(bon)}
      />

      {/* Dialogs */}
      <FuelFormDialog
        open={isFormOpen}
        bon={formBon}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <FuelDetailDialog
        open={detailBonId !== null}
        bonId={detailBonId}
        onClose={() => setDetailBonId(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le bon de carburant"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer le bon ${deleteTarget.numeroBon ? `#${deleteTarget.numeroBon}` : `#${deleteTarget.idBon}`} (${deleteTarget.immatriculation} - ${deleteTarget.litres} L) ?`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
