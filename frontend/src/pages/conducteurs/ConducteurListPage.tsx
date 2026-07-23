import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BlockIcon from '@mui/icons-material/Block';
import CancelIcon from '@mui/icons-material/Cancel';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useConducteurQuery,

  useConducteursQuery,
  useConducteurStats,
  useCreateConducteur,
  useDeleteConducteur,
  useUpdateConducteur,
  useUpdateConducteurStatus,
} from '../../features/conducteurs/useConducteurs';
import { Conducteur, ConducteurStatut } from '../../features/conducteurs/types';
import { ConducteurMobileList } from './ConducteurMobileList';
import { ConducteurFormDialog } from './ConducteurFormDialog';
import { ConducteurDetailDialog } from './ConducteurDetailDialog';
import { ConducteurStatusDialog } from './ConducteurStatusDialog';

const STATUT_CONFIG: Record<ConducteurStatut, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  DISPONIBLE: { label: 'Disponible', color: 'success' },
  EN_VOYAGE: { label: 'En voyage', color: 'info' },
  INDISPONIBLE: { label: 'Indisponible', color: 'warning' },
  INACTIF: { label: 'Inactif', color: 'error' },
};

export function ConducteurListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDriver, setFormDriver] = useState<Conducteur | null>(null);

  const [detailDriverId, setDetailDriverId] = useState<number | null>(null);

  const [statusDriver, setStatusDriver] = useState<Conducteur | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Conducteur | null>(null);

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
      statut: selectedStatut !== 'ALL' ? (selectedStatut as ConducteurStatut) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut]);

  // Queries & Mutations
  const { data: statsData } = useConducteurStats();
  const { data, isLoading, isError, error } = useConducteursQuery(queryParams);

  // Load detail for delete target to check document count dynamically
  const { data: deleteTargetDetail, isLoading: isDeleteDetailLoading } = useConducteurQuery(
    deleteTarget ? deleteTarget.id : null,
  );

  const createMutation = useCreateConducteur();
  const updateMutation = useUpdateConducteur();
  const updateStatusMutation = useUpdateConducteurStatus();
  const deleteMutation = useDeleteConducteur();

  const drivers = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (selectedStatut && selectedStatut !== 'ALL'),
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
    setPage(0);
  };

  // Handlers
  const handleOpenCreate = () => {
    setFormDriver(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (d: Conducteur) => {
    setFormDriver(d);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    if (formDriver) {
      await updateMutation.mutateAsync({ id: formDriver.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleStatusSubmit = async (newStatus: ConducteurStatut) => {
    if (statusDriver) {
      await updateStatusMutation.mutateAsync({ id: statusDriver.id, payload: { statut: newStatus } });
      setStatusDriver(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const deleteDocumentCount = deleteTargetDetail?.documents?.length ?? 0;

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Gestion des conducteurs"
        subtitle="Suivi opérationnel, coordonnées et statuts des conducteurs"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Conducteurs', to: '/conducteurs' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="conducteurs" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau conducteur
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total conducteurs</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.total ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Disponibles</Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">{statsData?.disponibles ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircleOutlineIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">En voyage</Typography>
                  <Typography variant="h4" fontWeight={700} color="info.main">{statsData?.enVoyage ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <LocalShippingIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Indisponibles</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{statsData?.indisponibles ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <BlockIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Inactifs</Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">{statsData?.inactifs ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                  <CancelIcon />
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
              placeholder="Rechercher par nom, téléphone, adresse..."
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
              <MenuItem value="DISPONIBLE">Disponible</MenuItem>
              <MenuItem value="EN_VOYAGE">En voyage</MenuItem>
              <MenuItem value="INDISPONIBLE">Indisponible</MenuItem>
              <MenuItem value="INACTIF">Inactif</MenuItem>
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des conducteurs.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Nom complet</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Adresse</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.length > 0 ? (
              drivers.map((d) => {
                const statusCfg = STATUT_CONFIG[d.statut] || { label: d.statut, color: 'default' as any };
                return (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {d.nomConducteur}
                      </Typography>
                    </TableCell>
                    <TableCell>{d.telephone || '—'}</TableCell>
                    <TableCell>{d.adresse || '—'}</TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter la fiche">
                          <IconButton size="small" color="info" onClick={() => setDetailDriverId(d.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="conducteurs" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(d)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Changer de statut">
                            <IconButton size="small" color="warning" onClick={() => setStatusDriver(d)}>
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="conducteurs" action="supprimer">
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(d)}>
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
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
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
                          Aucun conducteur ne correspond aux critères sélectionnés.
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
                    /* Inline Empty State: No drivers exist */
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                        <PersonIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun conducteur enregistré
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ajoutez votre premier conducteur pour commencer.
                        </Typography>
                      </Box>
                      <Can module="conducteurs" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouveau conducteur
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
      <ConducteurMobileList
        drivers={drivers}
        onView={(d) => setDetailDriverId(d.id)}
        onEdit={handleOpenEdit}
        onChangeStatus={(d) => setStatusDriver(d)}
        onDelete={(d) => setDeleteTarget(d)}
      />

      {/* Dialogs */}
      <ConducteurFormDialog
        open={isFormOpen}
        driver={formDriver}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConducteurDetailDialog
        open={detailDriverId !== null}
        driverId={detailDriverId}
        onClose={() => setDetailDriverId(null)}
      />

      <ConducteurStatusDialog
        open={statusDriver !== null}
        driver={statusDriver}
        onClose={() => setStatusDriver(null)}
        onSubmit={handleStatusSubmit}
        isLoading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le conducteur"
        description={
          deleteTarget ? (
            <Stack spacing={1.5}>
              <Typography variant="body1">
                Êtes-vous sûr de vouloir supprimer le conducteur <strong>{deleteTarget.nomConducteur}</strong> ?
              </Typography>
              {isDeleteDetailLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    Vérification des documents associés...
                  </Typography>
                </Stack>
              ) : deleteDocumentCount > 0 ? (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'warning.light',
                    color: 'warning.dark',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <WarningAmberIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    {deleteDocumentCount === 1
                      ? 'Ce conducteur contient 1 document enregistré qui sera également supprimé par cascade.'
                      : `Ce conducteur contient ${deleteDocumentCount} documents enregistrés qui seront également supprimés par cascade.`}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          ) : ''
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
