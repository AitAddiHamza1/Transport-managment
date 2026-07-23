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
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useClientsQuery,
  useClientStats,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
  useUpdateClientStatus,
} from '../../features/clients/useClients';
import { Client, ClientStatut } from '../../features/clients/types';
import { ClientMobileList } from './ClientMobileList';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientDetailDialog } from './ClientDetailDialog';
import { ClientStatusDialog } from './ClientStatusDialog';

const STATUT_CONFIG: Record<ClientStatut, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIF: { label: 'Actif', color: 'success' },
  INACTIF: { label: 'Inactif', color: 'warning' },
  BLOQUE: { label: 'Bloqué', color: 'error' },
};

export function ClientListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formClient, setFormClient] = useState<Client | null>(null);

  const [detailClientId, setDetailClientId] = useState<number | null>(null);

  const [statusClient, setStatusClient] = useState<Client | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

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
      statut: selectedStatut !== 'ALL' ? (selectedStatut as ClientStatut) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut]);

  // Queries & Mutations
  const { data: statsData } = useClientStats();
  const { data, isLoading, isError, error } = useClientsQuery(queryParams);

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const updateStatusMutation = useUpdateClientStatus();
  const deleteMutation = useDeleteClient();

  const clients = data?.data || [];
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
    setFormClient(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setFormClient(c);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    if (formClient) {
      await updateMutation.mutateAsync({ id: formClient.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleStatusSubmit = async (newStatus: ClientStatut) => {
    if (statusClient) {
      await updateStatusMutation.mutateAsync({ id: statusClient.id, payload: { statut: newStatus } });
      setStatusClient(null);
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
        title="Gestion des clients"
        subtitle="Raison sociale, identifiants (ICE), contacts et plafonds de crédit"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Clients', to: '/clients' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="clients" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouveau client
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
                  <Typography variant="caption" color="text.secondary">Total clients</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.total ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <BusinessIcon />
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
                  <Typography variant="caption" color="text.secondary">Clients actifs</Typography>
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des clients.'}
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
              <TableCell>Plafond crédit</TableCell>
              <TableCell>Délai paiement</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.length > 0 ? (
              clients.map((c) => {
                const statusCfg = STATUT_CONFIG[c.statut] || { label: c.statut, color: 'default' as any };
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {c.nomEntreprise}
                      </Typography>
                      {c.email && (
                        <Typography variant="caption" color="text.secondary">
                          {c.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{c.ice || '—'}</TableCell>
                    <TableCell>{c.telephone || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        {c.limiteCredit.toLocaleString()} MAD
                      </Typography>
                    </TableCell>
                    <TableCell>{c.delaiPaiementJours} j</TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter la fiche">
                          <IconButton size="small" color="info" onClick={() => setDetailClientId(c.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="clients" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(c)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Changer de statut">
                            <IconButton size="small" color="warning" onClick={() => setStatusClient(c)}>
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="clients" action="supprimer">
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(c)}>
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
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun résultat trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Aucun client ne correspond aux critères sélectionnés.
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
                    /* Inline Empty State: No clients exist */
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                        <BusinessIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun client enregistré
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ajoutez votre premier client pour commencer.
                        </Typography>
                      </Box>
                      <Can module="clients" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouveau client
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
      <ClientMobileList
        clients={clients}
        onView={(c) => setDetailClientId(c.id)}
        onEdit={handleOpenEdit}
        onChangeStatus={(c) => setStatusClient(c)}
        onDelete={(c) => setDeleteTarget(c)}
      />

      {/* Dialogs */}
      <ClientFormDialog
        open={isFormOpen}
        client={formClient}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ClientDetailDialog
        open={detailClientId !== null}
        clientId={detailClientId}
        onClose={() => setDetailClientId(null)}
      />

      <ClientStatusDialog
        open={statusClient !== null}
        client={statusClient}
        onClose={() => setStatusClient(null)}
        onSubmit={handleStatusSubmit}
        isLoading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le client"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer le client "${deleteTarget.nomEntreprise}" ? La suppression sera bloquée s’il existe des voyages, factures ou créances associées.`
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
