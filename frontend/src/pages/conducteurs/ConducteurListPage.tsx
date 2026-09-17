import {
  Avatar,
  Box,
  Button,
  CircularProgress,
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
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BlockIcon from '@mui/icons-material/Block';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const STATUT_CONFIG: Record<ConducteurStatut, { label: string }> = {
  DISPONIBLE: { label: 'Disponible' },
  EN_VOYAGE: { label: 'En voyage' },
  INDISPONIBLE: { label: 'Indisponible' },
  INACTIF: { label: 'Inactif' },
};

export function ConducteurListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDriver, setFormDriver] = useState<Conducteur | null>(null);

  const [detailDriverId, setDetailDriverId] = useState<number | null>(() => {
    const cid = searchParams.get('conducteurId');
    if (cid) {
      const parsed = parseInt(cid, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  });

  const [statusDriver, setStatusDriver] = useState<Conducteur | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Conducteur | null>(null);

  const handleCloseDetail = () => {
    setDetailDriverId(null);
    if (searchParams.has('conducteurId')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('conducteurId');
      setSearchParams(newParams, { replace: true });
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const cid = searchParams.get('conducteurId');
    if (cid) {
      const parsed = parseInt(cid, 10);
      if (!isNaN(parsed)) {
        setDetailDriverId(parsed);
      }
    }
  }, [searchParams]);

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
      {/* Primary list page Header without breadcrumbs */}
      <PageHeader
        title="Gestion des conducteurs"
        subtitle="Suivi opérationnel, coordonnées et statuts des conducteurs"
        hideBreadcrumbs
        action={
          <Can module="conducteurs" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau conducteur
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards (5 metrics, responsive grid without decimal props) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        <StatCard
          label="Total conducteurs"
          value={statsData?.total ?? 0}
          icon={<PersonIcon />}
          iconBgColor="primary.light"
        />

        <StatCard
          label="Disponibles"
          value={statsData?.disponibles ?? 0}
          icon={<CheckCircleOutlineIcon />}
          iconBgColor="success.light"
          valueColor="success.main"
        />

        <StatCard
          label="En voyage"
          value={statsData?.enVoyage ?? 0}
          icon={<LocalShippingIcon />}
          iconBgColor="info.light"
          valueColor="info.main"
        />

        <StatCard
          label="Indisponibles"
          value={statsData?.indisponibles ?? 0}
          icon={<BlockIcon />}
          iconBgColor="warning.light"
          valueColor="warning.main"
        />

        <StatCard
          label="Inactifs"
          value={statsData?.inactifs ?? 0}
          icon={<CancelIcon />}
          iconBgColor="error.light"
          valueColor="error.main"
        />
      </Box>

      {/* Filter Toolbar */}
      <ListToolbar
        searchField={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par nom, téléphone, adresse..."
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
          <MenuItem value="DISPONIBLE">Disponible</MenuItem>
          <MenuItem value="EN_VOYAGE">En voyage</MenuItem>
          <MenuItem value="INDISPONIBLE">Indisponible</MenuItem>
          <MenuItem value="INACTIF">Inactif</MenuItem>
        </TextField>
      </ListToolbar>

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des conducteurs.'}
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
                <TableCell>Conducteur</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Adresse</TableCell>
                <TableCell>Statut RH</TableCell>
                <TableCell>Statut Opérationnel</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drivers.length > 0 ? (
                drivers.map((d) => {
                  const phoneDisplay = d.employe ? d.employe.telephone : d.telephone;
                  const addressDisplay = d.employe ? d.employe.adresse : d.adresse;
                  return (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {d.nomConducteur}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {d.employe ? (
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {d.employe.matricule}
                          </Typography>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{phoneDisplay || '—'}</TableCell>
                      <TableCell>{addressDisplay || '—'}</TableCell>
                      <TableCell>
                        {d.employe ? (
                          <StatusChip
                            variant={d.employe.statut}
                            label={d.employe.statut}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          variant={d.statut}
                          label={STATUT_CONFIG[d.statut]?.label || d.statut}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Consulter la fiche">
                            <IconButton size="small" color="info" onClick={() => setDetailDriverId(d.id)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {d.employe && (
                            <Tooltip title="Fiche Employé">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => {
                                  if (d.employe) {
                                    window.location.href = `/employes?search=${d.employe.matricule}`;
                                  }
                                }}
                              >
                                <PersonIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

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
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    {hasActiveFilters ? (
                      /* Inline Empty State: Filters/Search active */
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                          <SearchIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
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
                        <Box sx={{ textAlign: 'center' }}>
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
        </DataTableShell>
      </Box>

      {/* Mobile Card List */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <ConducteurMobileList
          drivers={drivers}
          onView={(d) => setDetailDriverId(d.id)}
          onEdit={handleOpenEdit}
          onChangeStatus={(d) => setStatusDriver(d)}
          onDelete={(d) => setDeleteTarget(d)}
        />
      </Box>

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
        onClose={handleCloseDetail}
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

