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
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BuildIcon from '@mui/icons-material/Build';
import CancelIcon from '@mui/icons-material/Cancel';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useUpdateVehicleStatus,
  useVehiclesQuery,
  useVehicleStats,
} from '../../features/vehicles/useVehicles';
import { Vehicule, VehiculeStatut } from '../../features/vehicles/types';
import { VehicleMobileList } from './VehicleMobileList';
import { VehicleFormDialog } from './VehicleFormDialog';
import { VehicleDetailDialog } from './VehicleDetailDialog';
import { VehicleStatusDialog } from './VehicleStatusDialog';

const STATUT_CONFIG: Record<VehiculeStatut, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  DISPONIBLE: { label: 'Disponible', color: 'success' },
  EN_VOYAGE: { label: 'En voyage', color: 'info' },
  MAINTENANCE: { label: 'Maintenance', color: 'warning' },
  HORS_SERVICE: { label: 'Hors service', color: 'error' },
};

export function VehicleListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formVehicle, setFormVehicle] = useState<Vehicule | null>(null);

  const [detailVehicleId, setDetailVehicleId] = useState<number | null>(null);

  const [statusVehicle, setStatusVehicle] = useState<Vehicule | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Vehicule | null>(null);

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
      statut: selectedStatut !== 'ALL' ? (selectedStatut as VehiculeStatut) : undefined,
      typeVehicule: selectedType !== 'ALL' ? selectedType : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut, selectedType]);

  // Queries & Mutations
  const { data: statsData } = useVehicleStats();
  const { data, isLoading, isError, error } = useVehiclesQuery(queryParams);

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const updateStatusMutation = useUpdateVehicleStatus();
  const deleteMutation = useDeleteVehicle();

  const vehicles = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Page auto-correction on row deletion
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  // Handlers
  const handleOpenCreate = () => {
    setFormVehicle(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (v: Vehicule) => {
    setFormVehicle(v);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    if (formVehicle) {
      await updateMutation.mutateAsync({ id: formVehicle.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleStatusSubmit = async (newStatus: VehiculeStatut) => {
    if (statusVehicle) {
      await updateStatusMutation.mutateAsync({ id: statusVehicle.id, payload: { statut: newStatus } });
      setStatusVehicle(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Flotte de véhicules"
        subtitle="Gestion et suivi opérationnel des véhicules de transport"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Véhicules', to: '/vehicules' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="vehicules" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau véhicule
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
                  <Typography variant="caption" color="text.secondary">Total véhicules</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.total ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <DirectionsBusIcon />
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
                  <Typography variant="caption" color="text.secondary">Maintenance</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{statsData?.maintenance ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <BuildIcon />
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
                  <Typography variant="caption" color="text.secondary">Hors service</Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">{statsData?.horsService ?? 0}</Typography>
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
          <Grid item xs={12} md={6}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par immatriculation, marque, modèle, châssis..."
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

          <Grid item xs={6} md={3}>
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
              <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
              <MenuItem value="HORS_SERVICE">Hors service</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} md={3}>
            <TextField
              select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(0);
              }}
              label="Type"
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">Tous les types</MenuItem>
              <MenuItem value="CAMION">CAMION</MenuItem>
              <MenuItem value="TRACTEUR">TRACTEUR</MenuItem>
              <MenuItem value="REMORQUE">REMORQUE</MenuItem>
              <MenuItem value="UTILITAIRE">UTILITAIRE</MenuItem>
              <MenuItem value="CITERNE">CITERNE</MenuItem>
              <MenuItem value="PORTE_CONTENEUR">PORTE_CONTENEUR</MenuItem>
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des véhicules.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Immatriculation</TableCell>
              <TableCell>Marque & Modèle</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Capacité (T)</TableCell>
              <TableCell>Année</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.length > 0 ? (
              vehicles.map((v) => {
                const statusCfg = STATUT_CONFIG[v.statut] || { label: v.statut, color: 'default' as any };
                return (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {v.immatriculation}
                      </Typography>
                      {v.numeroChassis && (
                        <Typography variant="caption" color="text.secondary">
                          VIN: {v.numeroChassis}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {v.marque}
                      </Typography>
                      {v.modele && (
                        <Typography variant="caption" color="text.secondary">
                          {v.modele}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={v.typeVehicule} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {v.capaciteCharge !== null ? `${v.capaciteCharge} T` : '—'}
                    </TableCell>
                    <TableCell>{v.annee || '—'}</TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter la fiche">
                          <IconButton size="small" color="info" onClick={() => setDetailVehicleId(v.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="vehicules" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(v)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Changer de statut">
                            <IconButton size="small" color="warning" onClick={() => setStatusVehicle(v)}>
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="vehicules" action="supprimer">
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
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Aucun véhicule trouvé.</Typography>
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
      <VehicleMobileList
        vehicles={vehicles}
        onView={(v) => setDetailVehicleId(v.id)}
        onEdit={handleOpenEdit}
        onChangeStatus={(v) => setStatusVehicle(v)}
        onDelete={(v) => setDeleteTarget(v)}
      />

      {/* Dialogs */}
      <VehicleFormDialog
        open={isFormOpen}
        vehicle={formVehicle}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <VehicleDetailDialog
        open={detailVehicleId !== null}
        vehicleId={detailVehicleId}
        onClose={() => setDetailVehicleId(null)}
      />

      <VehicleStatusDialog
        open={statusVehicle !== null}
        vehicle={statusVehicle}
        onClose={() => setStatusVehicle(null)}
        onSubmit={handleStatusSubmit}
        isLoading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le véhicule"
        description={`Êtes-vous sûr de vouloir supprimer le véhicule ${deleteTarget?.immatriculation} ? Attention : tous les documents associés à ce véhicule seront également supprimés.`}
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
