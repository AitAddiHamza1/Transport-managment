import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import {
  useCreateRole,
  useDeleteRole,
  useRolesQuery,
  useUpdateRole,
} from '../../features/roles/useRoles';
import type { Role, RolePayload } from '../../features/roles/types';
import { ConfirmDialog } from '../../components/shared';
import { RoleFormDialog } from './RoleFormDialog';
import { PROFILE_LABELS } from '../../constants/permissions';
import { useAuth } from '../../features/auth/useAuth';

export function RolesTab() {
  const { user: currentUser } = useAuth();
  const isAdminGeneral = currentUser?.isAdminGeneral ?? false;

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [toDeleteRole, setToDeleteRole] = useState<Role | null>(null);

  const { data, isLoading, isError } = useRolesQuery({ page: 1, limit: 100, sortBy: 'id', sortOrder: 'asc' });
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const roles = data?.data ?? [];

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleSubmit = (payload: RolePayload) => {
    if (editingRole) {
      updateRole.mutate(
        { id: editingRole.id, payload },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createRole.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleDelete = () => {
    if (!toDeleteRole) return;
    deleteRole.mutate(toDeleteRole.id, { onSuccess: () => setToDeleteRole(null) });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Rôles & Profils d’accès
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rôles système prédéfinis et profils sur mesure attribués aux utilisateurs.
          </Typography>
        </Box>
        {isAdminGeneral && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Ajouter un rôle sur mesure
          </Button>
        )}
      </Stack>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {isError ? (
        <Alert severity="error">Impossible de charger la liste des rôles.</Alert>
      ) : (
        <Grid container spacing={2}>
          {roles.map((role) => {
            const displayName = PROFILE_LABELS[role.nom] ?? role.nom;
            return (
              <Grid item xs={12} sm={6} md={4} key={role.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {displayName}
                      </Typography>
                      {role.isSystem ? (
                        <Chip
                          size="small"
                          icon={<SecurityIcon fontSize="small" />}
                          label="Système"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="Sur mesure" color="default" />
                      )}
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 40 }}>
                      {role.description ?? 'Aucune description fournie.'}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 2, color: 'text.secondary' }}>
                      <PeopleIcon fontSize="small" />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {role.userCount} utilisateur{role.userCount > 1 ? 's' : ''}
                      </Typography>
                    </Stack>
                  </CardContent>

                  {isAdminGeneral && !role.isSystem && (
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => handleOpenEdit(role)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={role.userCount > 0 ? 'Attribué à des utilisateurs' : 'Supprimer'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={role.userCount > 0}
                            onClick={() => setToDeleteRole(role)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <RoleFormDialog
        open={formOpen}
        role={editingRole}
        loading={createRole.isPending || updateRole.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(toDeleteRole)}
        title="Supprimer le rôle"
        description={`Confirmer la suppression du rôle « ${toDeleteRole?.nom} » ?`}
        confirmLabel="Supprimer"
        loading={deleteRole.isPending}
        onConfirm={handleDelete}
        onClose={() => setToDeleteRole(null)}
      />
    </Box>
  );
}
