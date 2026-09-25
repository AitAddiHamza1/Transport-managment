import {
  Avatar,
  Box,
  Button,
  Chip,
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
import RouteIcon from '@mui/icons-material/Route';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NavigationIcon from '@mui/icons-material/Navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import {
  AppPagination,
  DataTableShell,
  KpiGrid,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';
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

const STATUT_CONFIG: Record<VoyageStatut, { label: string }> = {
  PLANIFIE: { label: 'Planifié' },
  EN_COURS: { label: 'En cours' },
  LIVRE: { label: 'Livré' },
  ANNULE: { label: 'Annulé' },
  FACTURE: { label: 'Facturé' },
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
      {/* Primary list page Header without breadcrumbs */}
      <PageHeader
        title="Gestion des voyages"
        subtitle="Ordres de transport, itinéraires, affectations des véhicules et conducteurs"
        hideBreadcrumbs
        action={
          <Can module="voyages" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau voyage
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards (4 metrics, responsive grid) */}
      <KpiGrid columns={4}>
        <StatCard
          label="Total voyages"
          value={statsData?.total ?? 0}
          icon={<RouteIcon />}
          iconBgColor="primary.light"
        />

        <StatCard
          label="Planifiés"
          value={statsData?.planifies ?? 0}
          icon={<CalendarMonthIcon />}
          iconBgColor="info.light"
          valueColor="info.main"
        />

        <StatCard
          label="En cours"
          value={statsData?.enCours ?? 0}
          icon={<NavigationIcon />}
          iconBgColor="warning.light"
          valueColor="warning.main"
        />

        <StatCard
          label="Livrés"
          value={statsData?.livres ?? 0}
          icon={<CheckCircleIcon />}
          iconBgColor="success.light"
          valueColor="success.main"
        />
      </KpiGrid>

      {/* Filter Toolbar */}
      <ListToolbar
        searchField={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par trajet, CMR, client, conducteur, véhicules..."
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
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Tous les statuts</MenuItem>
          <MenuItem value="PLANIFIE">Planifié</MenuItem>
          <MenuItem value="EN_COURS">En cours</MenuItem>
          <MenuItem value="LIVRE">Livré</MenuItem>
          <MenuItem value="ANNULE">Annulé</MenuItem>
          <MenuItem value="FACTURE">Facturé</MenuItem>
        </TextField>

        <TextField
          select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setPage(0);
          }}
          label="Type de voyage"
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Tous les types</MenuItem>
          <MenuItem value="NATIONAL">National</MenuItem>
          <MenuItem value="INTERNATIONAL">International</MenuItem>
          <MenuItem value="IMPORT">Import</MenuItem>
          <MenuItem value="EXPORT">Export</MenuItem>
        </TextField>
      </ListToolbar>

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des voyages.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell
          density="standard"
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
                  return (
                    <TableRow key={v.idVoyage} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
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
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {v.montantVoyage.toLocaleString('fr-FR')} {v.devise || 'MAD'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          variant={v.statut}
                          label={STATUT_CONFIG[v.statut]?.label || v.statut}
                        />
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
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                          <SearchIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
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
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                          <RouteIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
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
        </DataTableShell>
      </Box>

      {/* Mobile Card List */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <VoyageMobileList
          voyages={voyages}
          onView={(v) => setDetailVoyageId(v.idVoyage)}
          onEdit={handleOpenEdit}
          onChangeStatus={(v) => setStatusVoyage(v)}
          onDelete={(v) => setDeleteTarget(v)}
        />
      </Box>

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

