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
  MenuItem,
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
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteIcon from '@mui/icons-material/Delete';
import RouteIcon from '@mui/icons-material/Route';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NavigationIcon from '@mui/icons-material/Navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useVoyagesQuery,
  useVoyageStats,
  useCreateVoyage,
  useDeleteVoyage,
  useUpdateVoyage,
  useUpdateVoyageStatus,
} from '../../features/voyages/useVoyages';
import { Voyage, VoyageStatut, VoyageType } from '../../features/voyages/types';
import { VoyageMobileList } from './VoyageMobileList';
import { VoyageFormDialog } from './VoyageFormDialog';
import { VoyageDetailDialog } from './VoyageDetailDialog';
import { VoyageStatusDialog } from './VoyageStatusDialog';

const STATUT_CONFIG: Record<VoyageStatut, { label: string; color: 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  PLANIFIE: { label: 'Planifié', color: 'info' },
  EN_COURS: { label: 'En cours', color: 'warning' },
  LIVRE: { label: 'Livré', color: 'success' },
  ANNULE: { label: 'Annulé', color: 'error' },
  FACTURE: { label: 'Facturé', color: 'secondary' },
};

export function VoyageListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formVoyage, setFormVoyage] = useState<Voyage | null>(null);

  const [detailVoyageId, setDetailVoyageId] = useState<number | null>(null);

  const [statusVoyage, setStatusVoyage] = useState<Voyage | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Voyage | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Query params
  const queryParams = useMemo(() => {
    return {
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      statut: selectedStatut !== 'ALL' ? (selectedStatut as VoyageStatut) : undefined,
      typeVoyage: selectedType !== 'ALL' ? (selectedType as VoyageType) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut, selectedType]);

  // Queries & Mutations
  const { data: statsData } = useVoyageStats();
  const { data, isLoading, isError, error } = useVoyagesQuery(queryParams);

  const createMutation = useCreateVoyage();
  const updateMutation = useUpdateVoyage();
  const updateStatusMutation = useUpdateVoyageStatus();
  const deleteMutation = useDeleteVoyage();

  const voyages = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      (selectedStatut && selectedStatut !== 'ALL') ||
      (selectedType && selectedType !== 'ALL'),
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
    setSelectedStatut('ALL');
    setSelectedType('ALL');
    setPage(0);
  };

  // Handlers
  const handleOpenCreate = () => {
    setFormVoyage(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (v: Voyage) => {
    setFormVoyage(v);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    if (formVoyage) {
      await updateMutation.mutateAsync({ id: formVoyage.idVoyage, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleStatusSubmit = async (newStatus: VoyageStatut) => {
    if (statusVoyage) {
      await updateStatusMutation.mutateAsync({ id: statusVoyage.idVoyage, payload: { statut: newStatus } });
      setStatusVoyage(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.idVoyage);
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Gestion des voyages"
        subtitle="Ordres de transport, itinéraires, affectations des véhicules et conducteurs"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Voyages', to: '/voyages' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="voyages" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau voyage
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
                  <Typography variant="caption" color="text.secondary">Total voyages</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.total ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <RouteIcon />
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
                  <Typography variant="caption" color="text.secondary">Planifiés</Typography>
                  <Typography variant="h4" fontWeight={700} color="info.main">{statsData?.planifies ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <CalendarMonthIcon />
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
                  <Typography variant="caption" color="text.secondary">En cours</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{statsData?.enCours ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <NavigationIcon />
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
                  <Typography variant="caption" color="text.secondary">Livrés</Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">{statsData?.livres ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par trajet, CMR, client, conducteur, véhicules..."
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

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              value={selectedStatut}
              onChange={(e) => {
                setSelectedStatut(e.target.value);
                setPage(0);
              }}
              label="Statut"
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              <MenuItem value="PLANIFIE">Planifié</MenuItem>
              <MenuItem value="EN_COURS">En cours</MenuItem>
              <MenuItem value="LIVRE">Livré</MenuItem>
              <MenuItem value="ANNULE">Annulé</MenuItem>
              <MenuItem value="FACTURE">Facturé</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(0);
              }}
              label="Type de voyage"
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">Tous les types</MenuItem>
              <MenuItem value="NATIONAL">National</MenuItem>
              <MenuItem value="INTERNATIONAL">International</MenuItem>
              <MenuItem value="IMPORT">Import</MenuItem>
              <MenuItem value="EXPORT">Export</MenuItem>
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des voyages.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Voyage & Type</TableCell>
              <TableCell>Itinéraire (Départ ➔ Arrivée)</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Véhicule & Conducteur</TableCell>
              <TableCell>Date chargement</TableCell>
              <TableCell>Montant</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {voyages.length > 0 ? (
              voyages.map((v) => {
                const statusCfg = STATUT_CONFIG[v.statut] || { label: v.statut, color: 'default' as any };
                return (
                  <TableRow key={v.idVoyage} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        #{v.idVoyage}
                      </Typography>
                      <Chip label={v.typeVoyage} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {v.lieuChargement} ➔ {v.lieuDechargement}
                      </Typography>
                      {v.numeroCmr && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          CMR: {v.numeroCmr}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{v.nomClient || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {v.tracteur || 'Tracteur —'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {v.nomConducteur || 'Conducteur —'}
                      </Typography>
                    </TableCell>
                    <TableCell>{v.dateChargement || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {v.montantVoyage.toLocaleString('fr-FR')} MAD
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter la fiche">
                          <IconButton size="small" color="info" onClick={() => setDetailVoyageId(v.idVoyage)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="voyages" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(v)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Changer de statut">
                            <IconButton size="small" color="warning" onClick={() => setStatusVoyage(v)}>
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="voyages" action="supprimer">
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(v)}>
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
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  {hasActiveFilters ? (
                    /* Inline Empty State: Filters/Search active */
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                        <SearchIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun résultat trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Aucun voyage ne correspond aux critères sélectionnés.
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
                    /* Inline Empty State: No voyages exist */
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                        <RouteIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun voyage enregistré
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Planifiez votre premier voyage pour commencer.
                        </Typography>
                      </Box>
                      <Can module="voyages" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouveau voyage
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
      <VoyageMobileList
        voyages={voyages}
        onView={(v) => setDetailVoyageId(v.idVoyage)}
        onEdit={handleOpenEdit}
        onChangeStatus={(v) => setStatusVoyage(v)}
        onDelete={(v) => setDeleteTarget(v)}
      />

      {/* Dialogs */}
      <VoyageFormDialog
        open={isFormOpen}
        voyage={formVoyage}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <VoyageDetailDialog
        open={detailVoyageId !== null}
        voyageId={detailVoyageId}
        onClose={() => setDetailVoyageId(null)}
      />

      <VoyageStatusDialog
        open={statusVoyage !== null}
        voyage={statusVoyage}
        onClose={() => setStatusVoyage(null)}
        onSubmit={handleStatusSubmit}
        isLoading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le voyage"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer le voyage #${deleteTarget.idVoyage} (${deleteTarget.lieuChargement} ➔ ${deleteTarget.lieuDechargement}) ? La suppression est impossible si ce voyage est lié à des factures.`
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
