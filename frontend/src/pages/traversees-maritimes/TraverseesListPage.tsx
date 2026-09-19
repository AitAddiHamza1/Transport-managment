import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Skeleton,
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
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import RouteIcon from '@mui/icons-material/Route';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import {
  AppPagination,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
} from '../../components/shared';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import { TraverseeMobileList } from './TraverseeMobileList';
import { TraverseeDetailDialog } from './TraverseeDetailDialog';
import { TraverseeFormDialog } from './TraverseeFormDialog';

import {
  useCreateTraverseeMutation,
  useDeleteTraverseeMutation,
  useToggleVerificationMutation,
  useTraverseesQuery,
  useTraverseeStatsQuery,
  useUpdateTraverseeMutation,
} from '../../features/traversees-maritimes/useTraversees';
import type {
  CreateTraverseePayload,
  LieuEmbarquement,
  QueryTraverseeParams,
  TraverseeMaritime,
} from '../../features/traversees-maritimes/types';
import { LIEUX_EMBARQUEMENT } from '../../features/traversees-maritimes/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { usePermission } from '../../features/auth/usePermission';
import { traverseesApi } from '../../features/traversees-maritimes/traverseesApi';
import { notify } from '../../utils/notify';

export function TraverseesListPage() {
  const { can } = usePermission();
  const canCreate = can('traversees_maritimes', 'ajouter');
  const canEdit = can('traversees_maritimes', 'modifier');
  const canDelete = can('traversees_maritimes', 'supprimer');

  // Query state
  const [params, setParams] = useState<QueryTraverseeParams>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'id',
    sortOrder: 'desc',
    associationVoyage: 'tous',
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<TraverseeMaritime | null>(null);

  // Queries
  const { data: traverseesData, isLoading, isError, error, refetch } = useTraverseesQuery(params);
  const { data: statsData, isLoading: isLoadingStats } = useTraverseeStatsQuery();
  const { data: vehiculesData } = useVehiclesQuery({ limit: 100 });
  const { data: conducteursData } = useConducteursQuery({ limit: 100 });

  // Mutations
  const createMutation = useCreateTraverseeMutation();
  const updateMutation = useUpdateTraverseeMutation();
  const toggleVerificationMutation = useToggleVerificationMutation();
  const deleteMutation = useDeleteTraverseeMutation();

  const traversees = traverseesData?.data || [];
  const meta = traverseesData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const vehicules = vehiculesData?.data || [];
  const conducteurs = conducteursData?.data || [];

  const handleSearchChange = (value: string) => {
    setParams((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: TraverseeMaritime) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleOpenDetail = (item: TraverseeMaritime) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleOpenDelete = (item: TraverseeMaritime) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    await deleteMutation.mutateAsync(selectedItem.id);
    setDeleteOpen(false);
    setSelectedItem(null);
  };

  const handleToggleVerification = (item: TraverseeMaritime) => {
    if (!canEdit) {
      notify.error('Vous n’avez pas la permission de modifier le statut de vérification');
      return;
    }
    toggleVerificationMutation.mutate({ id: item.id });
  };

  const handleFormSubmit = async (values: any, file?: File) => {
    if (selectedItem) {
      await updateMutation.mutateAsync({
        id: selectedItem.id,
        payload: {
          ...values,
          devise: 'MAD',
        },
      });
    } else {
      const payload: CreateTraverseePayload = {
        ...values,
        devise: 'MAD',
        file,
      };
      await createMutation.mutateAsync(payload);
    }
    setFormOpen(false);
    setSelectedItem(null);
  };

  const handlePreviewFile = async (item: TraverseeMaritime) => {
    try {
      const url = await traverseesApi.previewJustificatif(item.id);
      window.open(url, '_blank');
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Erreur d’ouverture du fichier');
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Traversées maritimes"
        subtitle="Gestion et suivi centralisé des traversées maritimes"
        hideBreadcrumbs
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Nouvelle traversée
            </Button>
          ) : undefined
        }
      />

      {/* Balanced KPI Cards Grid (4 cards) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Total traversées"
          value={statsData?.total ?? 0}
          icon={<DirectionsBoatIcon />}
          iconBgColor="primary.light"
          loading={isLoadingStats}
        />
        <StatCard
          label="Avec voyage"
          value={statsData?.avecVoyage ?? 0}
          icon={<RouteIcon />}
          iconBgColor="info.light"
          valueColor="info.main"
          loading={isLoadingStats}
        />
        <StatCard
          label="Sans voyage"
          value={statsData?.sansVoyage ?? 0}
          icon={<DirectionsBoatIcon />}
          iconBgColor="secondary.light"
          valueColor="secondary.main"
          loading={isLoadingStats}
        />
        <StatCard
          label="Coût total (MAD)"
          value={(statsData?.coutTotalMad ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          icon={<AccountBalanceWalletIcon />}
          iconBgColor="success.light"
          valueColor="success.main"
          loading={isLoadingStats}
        />
      </Box>

      {/* List Toolbar & Filters */}
      <Box sx={{ mb: 2 }}>
        <ListToolbar
          searchField={
            <SearchField
              value={params.search || ''}
              onChange={handleSearchChange}
              placeholder="Rechercher par bateau, véhicule, conducteur, port..."
            />
          }
        >
          {/* Filter by Vehicle */}
          <TextField
            select
            size="small"
            label="Véhicule"
            value={params.immatriculation || ''}
            onChange={(e) => setParams((prev) => ({ ...prev, immatriculation: e.target.value || undefined, page: 1 }))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Tous les véhicules</MenuItem>
            {vehicules.map((v) => (
              <MenuItem key={v.id} value={v.immatriculation}>
                {v.immatriculation}
              </MenuItem>
            ))}
          </TextField>

          {/* Filter by Driver */}
          <TextField
            select
            size="small"
            label="Conducteur"
            value={params.idConducteur || ''}
            onChange={(e) => setParams((prev) => ({ ...prev, idConducteur: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Tous les conducteurs</MenuItem>
            {conducteurs.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nomConducteur}
              </MenuItem>
            ))}
          </TextField>

          {/* Filter by Embarkation */}
          <TextField
            select
            size="small"
            label="Embarquement"
            value={params.lieuEmbarquement || ''}
            onChange={(e) => setParams((prev) => ({ ...prev, lieuEmbarquement: (e.target.value as LieuEmbarquement) || undefined, page: 1 }))}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Tous les ports</MenuItem>
            {LIEUX_EMBARQUEMENT.map((lieu) => (
              <MenuItem key={lieu} value={lieu}>
                {lieu}
              </MenuItem>
            ))}
          </TextField>

          {/* Filter by Voyage association */}
          <TextField
            select
            size="small"
            label="Association Voyage"
            value={params.associationVoyage || 'tous'}
            onChange={(e) => setParams((prev) => ({ ...prev, associationVoyage: e.target.value as any, page: 1 }))}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="tous">Toutes les traversées</MenuItem>
            <MenuItem value="avec_voyage">Avec voyage</MenuItem>
            <MenuItem value="sans_voyage">Sans voyage</MenuItem>
          </TextField>
        </ListToolbar>
      </Box>

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell density="dense">
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }} align="center">Vérification</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Véhicule</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Conducteur</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bateau</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Embarquement</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Prix (MAD)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Voyage</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Justificatif</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton height={24} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography color="error">
                      {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des traversées maritimes.'}
                    </Typography>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => refetch()}>
                      Réessayer
                    </Button>
                  </TableCell>
                </TableRow>
              ) : traversees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                        <DirectionsBoatIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucune traversée maritime trouvée
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Enregistrez votre première traversée pour commencer le suivi maritime.
                        </Typography>
                      </Box>
                      {canCreate && (
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouvelle traversée
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                traversees.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      opacity: item.estVerifiee ? 0.72 : 1,
                      bgcolor: item.estVerifiee ? 'action.hover' : 'inherit',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <TableCell align="center">
                      <Tooltip title={item.estVerifiee ? 'Vérifiée (cliquer pour annuler)' : 'Marquer comme vérifiée'}>
                        <IconButton
                          size="small"
                          color={item.estVerifiee ? 'success' : 'default'}
                          onClick={() => handleToggleVerification(item)}
                          disabled={!canEdit || toggleVerificationMutation.isPending}
                        >
                          {item.estVerifiee ? (
                            <TaskAltIcon fontSize="small" color="success" />
                          ) : (
                            <RadioButtonUncheckedIcon fontSize="small" color="action" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.dateTraversee}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.immatriculation} size="small" variant="outlined" color="default" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.conducteur?.nomConducteur || 'Non renseigné'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <DirectionsBoatIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600}>
                          {item.bateau}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.lieuEmbarquement} size="small" color="primary" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {item.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.idVoyage ? (
                        <Chip
                          label={`V-00${item.idVoyage}`}
                          size="small"
                          color="info"
                          variant="filled"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {item.cheminFichier ? (
                        <Tooltip title="Voir le justificatif">
                          <IconButton size="small" color="primary" onClick={() => handlePreviewFile(item)}>
                            <AttachFileIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter les détails">
                          <IconButton size="small" color="info" onClick={() => handleOpenDetail(item)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canEdit && (
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => handleOpenDelete(item)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <AppPagination
            page={meta.page}
            pageSize={params.limit || 10}
            totalCount={meta.total}
            onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
            onPageSizeChange={(ps) => setParams((prev) => ({ ...prev, limit: ps, page: 1 }))}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </DataTableShell>
      </Box>

      {/* Mobile Card List View */}
      <TraverseeMobileList
        data={traversees}
        onView={handleOpenDetail}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onToggleVerification={handleToggleVerification}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Dialog Modals */}
      <TraverseeFormDialog
        open={formOpen}
        traversee={selectedItem}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <TraverseeDetailDialog
        open={detailOpen}
        traversee={selectedItem}
        onClose={() => setDetailOpen(false)}
        onToggleVerification={handleToggleVerification}
        canEdit={canEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer la traversée maritime"
        description={
          selectedItem
            ? `Êtes-vous sûr de vouloir supprimer la traversée maritime sur "${selectedItem.bateau}" ?`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
