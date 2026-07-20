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
  Paper,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { UserFormDialog } from './UserFormDialog';
import { AppPage, PageHeader, ConfirmDialog } from '../../components/shared';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUserStats,
  useUsersQuery,
} from '../../features/users/useUsers';
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

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
      sortBy: 'id' as const,
      sortOrder: 'asc' as const,
    }),
    [page, rowsPerPage, search],
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

  const toggleStatut = (user: User) => {
    updateUser.mutate({
      id: user.id,
      payload: { statut: user.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF' },
    });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteUser.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
  };

  return (
    <AppPage>
      <PageHeader
        title="Utilisateurs"
        breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Utilisateurs' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Ajouter un utilisateur
          </Button>
        }
      />

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
        </Box>

        {(isLoading || isFetching) && <LinearProgress />}

        {isError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Impossible de charger les utilisateurs.
          </Alert>
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
                  <TableCell align="right" width={150}>
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
                        <Tooltip title={user.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}>
                          <IconButton size="small" onClick={() => toggleStatut(user)}>
                            {user.statut === 'ACTIF' ? (
                              <BlockIcon fontSize="small" />
                            ) : (
                              <CheckCircleIcon fontSize="small" color="success" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => openEdit(user)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" color="error" onClick={() => setToDelete(user)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

      <UserFormDialog
        open={formOpen}
        user={editing}
        loading={createUser.isPending || updateUser.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
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
