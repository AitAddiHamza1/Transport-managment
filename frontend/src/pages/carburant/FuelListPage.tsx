import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useConsommationsGasoilQuery,
  useConsommationGasoilStats,
  useCreateConsommationGasoil,
  useDeleteConsommationGasoil,
  useUpdateConsommationGasoil,
} from '../../features/carburant/useCarburant';
import { BonCarburant, CreateBonCarburantPayload } from '../../features/carburant/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
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
    };
  }, [page, rowsPerPage, debouncedSearch, selectedVehicle]);

  // Queries & Mutations
  const { data: statsData } = useConsommationGasoilStats();
  const { data, isLoading, isError, error } = useConsommationsGasoilQuery(queryParams);

  const createMutation = useCreateConsommationGasoil();
  const updateMutation = useUpdateConsommationGasoil();
  const deleteMutation = useDeleteConsommationGasoil();

  const bons = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (selectedVehicle && selectedVehicle !== 'ALL'),
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

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Consommation gasoil & bons de carburant"
        subtitle="Suivi de la consommation de carburant, prix au litre et coûts opérationnels de la flotte"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Consommation gasoil', to: '/consommation-gasoil' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="bons_carburant" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau bon
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total bons</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.totalCount ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <LocalGasStationIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Litres consommés</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {(statsData?.totalLitres ?? 0).toLocaleString('fr-FR')} L
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <OpacityIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Montant total (MAD)</Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {(statsData?.totalMontant ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <AttachMoneyIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Prix moyen / Litre</Typography>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {(statsData?.prixMoyenLitre ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <CalculateIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par immatriculation, conducteur, station-service..."
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

          <Grid item xs={12} md={4}>
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

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Bon # & Date</TableCell>
              <TableCell>Véhicule immatriculé</TableCell>
              <TableCell>Conducteur</TableCell>
              <TableCell>Station / Fournisseur</TableCell>
              <TableCell>Quantité (L)</TableCell>
              <TableCell>Prix / L</TableCell>
              <TableCell>Montant Total</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bons.length > 0 ? (
              bons.map((bon) => (
                <TableRow key={bon.idBon} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>
                      #{bon.idBon}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bon.dateCarburant}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {bon.immatriculation}
                    </Typography>
                  </TableCell>
                  <TableCell>{bon.nomConducteur || '—'}</TableCell>
                  <TableCell>{bon.nomStation || '—'}</TableCell>
                  <TableCell>
                    <Chip label={`${bon.litres.toLocaleString('fr-FR')} L`} size="small" color="warning" variant="outlined" />
                  </TableCell>
                  <TableCell>{bon.prixParLitre.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {bon.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Consulter la fiche">
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
                          Ajoutez votre premier bon de carburant pour commencer le suivi des coûts.
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
            ? `Êtes-vous sûr de vouloir supprimer le bon #${deleteTarget.idBon} (${deleteTarget.immatriculation} - ${deleteTarget.litres} L - ${deleteTarget.montantTotal} MAD) ?`
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
