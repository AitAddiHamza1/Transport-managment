import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
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
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import GroupIcon from '@mui/icons-material/Group';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { UserFormDialog } from './UserFormDialog';
import { UserMobileList } from './UserMobileList';
import { RolesTab } from './RolesTab';
import {
  AppPagination,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
  ConfirmDialog,
  Can,
} from '../../components/shared';
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

export function UsersListPage() {
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

  const { data, isLoading, isError } = useUsersQuery(params);
  const { data: stats } = useUserStats();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  const hasActiveFilters = Boolean(
    searchInput.trim() || selectedStatut || selectedRoleId !== '',
  );

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedStatut('');
    setSelectedRoleId('');
    setPage(0);
  };

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
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Gestion des Accès"
        hideBreadcrumbs
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
          {/* Mini tableau de bord (4 cards, responsive 2-column mobile / 4-column desktop) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 1.5,
              mb: 2,
            }}
          >
            <StatCard label="Total" value={stats?.total ?? 0} icon={<GroupIcon />} iconBgColor="primary.light" />
            <StatCard label="Actifs" value={stats?.actifs ?? 0} icon={<CheckCircleIcon />} iconBgColor="success.light" valueColor="success.main" />
            <StatCard label="Inactifs" value={stats?.inactifs ?? 0} icon={<BlockIcon />} iconBgColor="action.hover" valueColor="text.secondary" />
            <StatCard label="Suspendus" value={stats?.suspendus ?? 0} icon={<PauseCircleIcon />} iconBgColor="warning.light" valueColor="warning.main" />
          </Box>

          {/* Filter Toolbar */}
          <ListToolbar
            searchField={
              <SearchField
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Rechercher (nom ou e-mail)…"
              />
            }
            onResetFilters={hasActiveFilters ? handleClearFilters : undefined}
            resetDisabled={!hasActiveFilters}
          >
            <TextField
              select
              size="small"
              label="Statut"
              value={selectedStatut}
              onChange={(e) => {
                setSelectedStatut(e.target.value as UserStatut | '');
                setPage(0);
              }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="ACTIF">ACTIF</MenuItem>
              <MenuItem value="INACTIF">INACTIF</MenuItem>
              <MenuItem value="SUSPENDU">SUSPENDU</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Profil / Rôle"
              value={selectedRoleId}
              onChange={(e) => {
                setSelectedRoleId(e.target.value ? Number(e.target.value) : '');
                setPage(0);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tous les rôles</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {PROFILE_LABELS[r.nom] ?? r.nom}
                </MenuItem>
              ))}
            </TextField>
          </ListToolbar>

          {/* Error state */}
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Impossible de charger les utilisateurs.
            </Alert>
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
                  totalCount={total}
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
                  {rows.length > 0 ? (
                    rows.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {user.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {user.nom}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.telephone ?? '—'}</TableCell>
                        <TableCell>{PROFILE_LABELS[user.role?.nom] ?? user.role?.nom ?? '—'}</TableCell>
                        <TableCell>
                          <StatusChip variant={user.statut} label={user.statut} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
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
                                <IconButton size="small" color="primary" onClick={() => openEdit(user)}>
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
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        {hasActiveFilters ? (
                          /* Empty state: Active filters */
                          <Stack spacing={2} alignItems="center" justifyContent="center">
                            <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                              <SearchIcon fontSize="large" />
                            </Avatar>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" fontWeight={600}>
                                Aucun résultat trouvé
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Aucun utilisateur ne correspond aux critères sélectionnés.
                              </Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<FilterAltOffIcon />}
                              onClick={handleClearFilters}
                            >
                              Réinitialiser les filtres
                            </Button>
                          </Stack>
                        ) : (
                          /* Empty state: No users */
                          <Stack spacing={2} alignItems="center" justifyContent="center">
                            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                              <GroupIcon fontSize="large" />
                            </Avatar>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" fontWeight={600}>
                                Aucun utilisateur enregistré
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Ajoutez votre premier utilisateur pour commencer.
                              </Typography>
                            </Box>
                            <Can module="utilisateurs" action="ajouter">
                              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
                                Ajouter un utilisateur
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

          {/* Mobile View */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <UserMobileList
              users={rows}
              onEdit={openEdit}
              onDelete={(u) => setToDelete(u)}
              onChangeStatus={(u, s) => setStatusChangeTarget({ user: u, newStatus: s })}
            />
          </Box>
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
        cancelLabel="Annuler"
        loading={updateUser.isPending}
        onConfirm={confirmStatusChange}
        onClose={() => setStatusChangeTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer l’utilisateur"
        description={`Confirmer la suppression de « ${toDelete?.nom} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        loading={deleteUser.isPending}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </Box>
  );
}

