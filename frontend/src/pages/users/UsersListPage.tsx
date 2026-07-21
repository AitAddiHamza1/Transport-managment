import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import { UserFormDialog } from './UserFormDialog';
import { UserMobileList } from './UserMobileList';
import { RolesTab } from './RolesTab';
import { AppPage, PageHeader, ConfirmDialog, Can } from '../../components/shared';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUserStats,
  useUsersQuery,
} from '../../features/users/useUsers';
import { useRoleOptions } from '../../features/roles/useRoles';
import type { CreateUserPayload, User, UserStatut } from '../../features/users/types';
import { PROFILE_LABELS } from '../../constants/permissions';

const STATUT_COLOR: Record<UserStatut, 'success' | 'default' | 'warning'> = {
  ACTIF: 'success',
  INACTIF: 'default',
  SUSPENDU: 'warning',
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, color }}>
        {value}
      </Typography>
    </Paper>
  );
}

export function UsersListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeTab, setActiveTab] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<UserStatut | ''>('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ user: User; newStatus: UserStatut } | null>(null);

  const { data: roles = [] } = useRoleOptions();

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
      statut: selectedStatut || undefined,
      idRole: selectedRoleId ? Number(selectedRoleId) : undefined,
      sortBy: 'id' as const,
      sortOrder: 'asc' as const,
    }),
    [page, rowsPerPage, search, selectedStatut, selectedRoleId],
  );

  const { data, isLoading, isError, isFetching } = useUsersQuery(params);
  const { data: stats } = useUserStats();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setFormOpen(true);
  };

  const handleSubmit = (payload: CreateUserPayload) => {
    if (editing) {
      updateUser.mutate({ id: editing.id, payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createUser.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  const confirmStatusChange = () => {
    if (!statusChangeTarget) return;
    updateUser.mutate(
      {
        id: statusChangeTarget.user.id,
        payload: { statut: statusChangeTarget.newStatus },
      },
      { onSuccess: () => setStatusChangeTarget(null) },
    );
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteUser.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
  };

  return (
    <AppPage>
      <PageHeader
        title="Gestion des Accès"
        breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Utilisateurs' }]}
        action={
          activeTab === 0 ? (
            <Can module="utilisateurs" action="ajouter">
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                Ajouter un utilisateur
              </Button>
            </Can>
          ) : undefined
        }
      />

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`Utilisateurs (${stats?.total ?? 0})`} />
          <Tab label="Rôles & Profils" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <>
          {/* Mini tableau de bord */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <StatCard label="Total" value={stats?.total ?? 0} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard label="Actifs" value={stats?.actifs ?? 0} color="success.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard label="Inactifs" value={stats?.inactifs ?? 0} color="text.secondary" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard label="Suspendus" value={stats?.suspendus ?? 0} color="warning.main" />
            </Grid>
          </Grid>

          <Paper>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    size="small"
                    placeholder="Rechercher (nom ou e-mail)…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={4}>
                  <TextField
                    select
                    size="small"
                    label="Statut"
                    value={selectedStatut}
                    onChange={(e) => {
                      setSelectedStatut(e.target.value as UserStatut | '');
                      setPage(0);
                    }}
                    fullWidth
                  >
                    <MenuItem value="">Tous les statuts</MenuItem>
                    <MenuItem value="ACTIF">ACTIF</MenuItem>
                    <MenuItem value="INACTIF">INACTIF</MenuItem>
                    <MenuItem value="SUSPENDU">SUSPENDU</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3} md={4}>
                  <TextField
                    select
                    size="small"
                    label="Profil / Rôle"
                    value={selectedRoleId}
                    onChange={(e) => {
                      setSelectedRoleId(e.target.value ? Number(e.target.value) : '');
                      setPage(0);
                    }}
                    fullWidth
                  >
                    <MenuItem value="">Tous les rôles</MenuItem>
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {PROFILE_LABELS[r.nom] ?? r.nom}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            {(isLoading || isFetching) && <LinearProgress />}

            {isError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                Impossible de charger les utilisateurs.
              </Alert>
            ) : isMobile ? (
              <UserMobileList
                users={rows}
                onEdit={openEdit}
                onDelete={(u) => setToDelete(u)}
                onChangeStatus={(u, s) => setStatusChangeTarget({ user: u, newStatus: s })}
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width={70}>ID</TableCell>
                      <TableCell>Nom</TableCell>
                      <TableCell>E-mail</TableCell>
                      <TableCell>Téléphone</TableCell>
                      <TableCell>Profil</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell align="right" width={180}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 && !isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">Aucun utilisateur trouvé.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.nom}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.telephone ?? '—'}</TableCell>
                          <TableCell>{PROFILE_LABELS[user.role?.nom] ?? user.role?.nom ?? '—'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={user.statut} color={STATUT_COLOR[user.statut]} />
                          </TableCell>
                          <TableCell align="right">
                            <Can module="utilisateurs" action="modifier">
                              {user.statut !== 'ACTIF' && (
                                <Tooltip title="Activer">
                                  <IconButton
                                    size="small"
                                    onClick={() => setStatusChangeTarget({ user, newStatus: 'ACTIF' })}
                                  >
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {user.statut !== 'INACTIF' && (
                                <Tooltip title="Désactiver">
                                  <IconButton
                                    size="small"
                                    onClick={() => setStatusChangeTarget({ user, newStatus: 'INACTIF' })}
                                  >
                                    <BlockIcon fontSize="small" color="action" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {user.statut !== 'SUSPENDU' && (
                                <Tooltip title="Suspendre">
                                  <IconButton
                                    size="small"
                                    onClick={() => setStatusChangeTarget({ user, newStatus: 'SUSPENDU' })}
                                  >
                                    <PauseCircleIcon fontSize="small" color="warning" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={() => openEdit(user)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Can>
                            <Can module="utilisateurs" action="supprimer">
                              <Tooltip title="Supprimer">
                                <IconButton size="small" color="error" onClick={() => setToDelete(user)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Can>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Lignes par page"
            />
          </Paper>
        </>
      )}

      {activeTab === 1 && <RolesTab />}

      <UserFormDialog
        open={formOpen}
        user={editing}
        loading={createUser.isPending || updateUser.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(statusChangeTarget)}
        title="Changement de statut"
        description={`Confirmer le passage du statut de « ${statusChangeTarget?.user.nom} » à « ${statusChangeTarget?.newStatus} » ?`}
        confirmLabel="Confirmer"
        loading={updateUser.isPending}
        onConfirm={confirmStatusChange}
        onClose={() => setStatusChangeTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer l’utilisateur"
        description={`Confirmer la suppression de « ${toDelete?.nom} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={deleteUser.isPending}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </AppPage>
  );
}
