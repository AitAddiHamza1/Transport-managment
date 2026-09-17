import {
  Avatar,
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
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
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import {
  AppPagination,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';
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

const STATUT_CONFIG: Record<FournisseurStatut, { label: string }> = {
  ACTIF: { label: 'Actif' },
  INACTIF: { label: 'Inactif' },
  BLOQUE: { label: 'Bloqué' },
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
      {/* Primary list page Header without breadcrumbs */}
      <PageHeader
        title="Gestion des fournisseurs"
        subtitle="Raison sociale, identifiants (ICE), coordonnées et statuts des partenaires"
        hideBreadcrumbs
        action={
          <Can module="fournisseurs" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau fournisseur
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards (4 metrics, responsive grid) */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label="Total fournisseurs"
            value={statsData?.total ?? 0}
            icon={<StorefrontIcon />}
            iconBgColor="primary.light"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label="Fournisseurs actifs"
            value={statsData?.actifs ?? 0}
            icon={<CheckCircleOutlineIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label="Inactifs"
            value={statsData?.inactifs ?? 0}
            icon={<PauseCircleOutlineIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label="Bloqués"
            value={statsData?.bloques ?? 0}
            icon={<BlockIcon />}
            iconBgColor="error.light"
            valueColor="error.main"
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <ListToolbar
        searchField={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par raison sociale, ICE, téléphone, email, adresse..."
          />
        }
        onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
        resetDisabled={!hasActiveFilters}
      >
        <TextField
          select
          value={selectedStatut}
          onChange={(e) => {
            setSelectedStatut(e.target.value);
            setPage(0);
          }}
          label="Statut"
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">Tous les statuts</MenuItem>
          <MenuItem value="ACTIF">Actif</MenuItem>
          <MenuItem value="INACTIF">Inactif</MenuItem>
          <MenuItem value="BLOQUE">Bloqué</MenuItem>
        </TextField>
      </ListToolbar>

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des fournisseurs.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell
          density="dense"
          loading={isLoading}
          pagination={
            <AppPagination
              page={page + 1}
              pageSize={rowsPerPage}
              totalCount={meta.total}
              onPageChange={(newPage) => setPage(newPage - 1)}
              onPageSizeChange={(newSize) => {
                setRowsPerPage(newSize);
                setPage(0);
              }}
            />
          }
        >
          <Table>
            <TableHead>
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
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
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
                        <StatusChip
                          variant={s.statut}
                          label={STATUT_CONFIG[s.statut]?.label || s.statut}
                        />
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
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                          <SearchIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
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
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                          <StorefrontIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
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
        </DataTableShell>
      </Box>

      {/* Mobile Card List */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <FournisseurMobileList
          suppliers={suppliers}
          onView={(s) => setDetailSupplierId(s.id)}
          onEdit={handleOpenEdit}
          onChangeStatus={(s) => setStatusSupplier(s)}
          onDelete={(s) => setDeleteTarget(s)}
        />
      </Box>

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

