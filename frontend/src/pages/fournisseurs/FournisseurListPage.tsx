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
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useFournisseursQuery,
  useFournisseurStats,
  useCreateFournisseur,
  useDeleteFournisseur,
  useUpdateFournisseur,
  useUpdateFournisseurStatus,
} from '../../features/fournisseurs/useFournisseurs';
import { Fournisseur, FournisseurStatut } from '../../features/fournisseurs/types';
import { FournisseurMobileList } from './FournisseurMobileList';
import { FournisseurFormDialog } from './FournisseurFormDialog';
import { FournisseurDetailDialog } from './FournisseurDetailDialog';
import { FournisseurStatusDialog } from './FournisseurStatusDialog';

const STATUT_CONFIG: Record<FournisseurStatut, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIF: { label: 'Actif', color: 'success' },
  INACTIF: { label: 'Inactif', color: 'warning' },
  BLOQUE: { label: 'Bloqué', color: 'error' },
};

export function FournisseurListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formSupplier, setFormSupplier] = useState<Fournisseur | null>(null);

  const [detailSupplierId, setDetailSupplierId] = useState<number | null>(null);

  const [statusSupplier, setStatusSupplier] = useState<Fournisseur | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Fournisseur | null>(null);

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
      statut: selectedStatut !== 'ALL' ? (selectedStatut as FournisseurStatut) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut]);

  // Queries & Mutations
  const { data: statsData } = useFournisseurStats();
  const { data, isLoading, isError, error } = useFournisseursQuery(queryParams);

  const createMutation = useCreateFournisseur();
  const updateMutation = useUpdateFournisseur();
  const updateStatusMutation = useUpdateFournisseurStatus();
  const deleteMutation = useDeleteFournisseur();

  const suppliers = data?.data || [];
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
    setFormSupplier(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Fournisseur) => {
    setFormSupplier(s);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    if (formSupplier) {
      await updateMutation.mutateAsync({ id: formSupplier.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleStatusSubmit = async (newStatus: FournisseurStatut) => {
    if (statusSupplier) {
      await updateStatusMutation.mutateAsync({ id: statusSupplier.id, payload: { statut: newStatus } });
      setStatusSupplier(null);
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
        title="Gestion des fournisseurs"
        subtitle="Raison sociale, identifiants (ICE), coordonnées et statuts des partenaires"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Fournisseurs', to: '/fournisseurs' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="fournisseurs" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau fournisseur
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
                  <Typography variant="caption" color="text.secondary">Total fournisseurs</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.total ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <StorefrontIcon />
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
                  <Typography variant="caption" color="text.secondary">Fournisseurs actifs</Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">{statsData?.actifs ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircleOutlineIcon />
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
                  <Typography variant="caption" color="text.secondary">Inactifs</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{statsData?.inactifs ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <PauseCircleOutlineIcon />
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
                  <Typography variant="caption" color="text.secondary">Bloqués</Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">{statsData?.bloques ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                  <BlockIcon />
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
              placeholder="Rechercher par raison sociale, ICE, téléphone, email, adresse..."
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
              <MenuItem value="ACTIF">Actif</MenuItem>
              <MenuItem value="INACTIF">Inactif</MenuItem>
              <MenuItem value="BLOQUE">Bloqué</MenuItem>
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des fournisseurs.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Raison sociale</TableCell>
              <TableCell>N° ICE</TableCell>
              <TableCell>Contact / Téléphone</TableCell>
              <TableCell>Adresse</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.length > 0 ? (
              suppliers.map((s) => {
                const statusCfg = STATUT_CONFIG[s.statut] || { label: s.statut, color: 'default' as any };
                return (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {s.nomFournisseur}
                      </Typography>
                      {s.email && (
                        <Typography variant="caption" color="text.secondary">
                          {s.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{s.ice || '—'}</TableCell>
                    <TableCell>{s.telephone || '—'}</TableCell>
                    <TableCell>{s.adresse || '—'}</TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter la fiche">
                          <IconButton size="small" color="info" onClick={() => setDetailSupplierId(s.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="fournisseurs" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(s)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Changer de statut">
                            <IconButton size="small" color="warning" onClick={() => setStatusSupplier(s)}>
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="fournisseurs" action="supprimer">
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(s)}>
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
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
                          Aucun fournisseur ne correspond aux critères sélectionnés.
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
                    /* Inline Empty State: No suppliers exist */
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                        <StorefrontIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun fournisseur enregistré
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ajoutez votre premier fournisseur pour commencer.
                        </Typography>
                      </Box>
                      <Can module="fournisseurs" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouveau fournisseur
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
      <FournisseurMobileList
        suppliers={suppliers}
        onView={(s) => setDetailSupplierId(s.id)}
        onEdit={handleOpenEdit}
        onChangeStatus={(s) => setStatusSupplier(s)}
        onDelete={(s) => setDeleteTarget(s)}
      />

      {/* Dialogs */}
      <FournisseurFormDialog
        open={isFormOpen}
        supplier={formSupplier}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <FournisseurDetailDialog
        open={detailSupplierId !== null}
        supplierId={detailSupplierId}
        onClose={() => setDetailSupplierId(null)}
      />

      <FournisseurStatusDialog
        open={statusSupplier !== null}
        supplier={statusSupplier}
        onClose={() => setStatusSupplier(null)}
        onSubmit={handleStatusSubmit}
        isLoading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le fournisseur"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer le fournisseur "${deleteTarget.nomFournisseur}" ? La suppression sera bloquée s’il existe des dettes ou paiements associés.`
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
