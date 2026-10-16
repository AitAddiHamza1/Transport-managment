import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  useCreateRole,
  useDeleteRole,
  useRolesQuery,
  useUpdateRole,
} from '../../features/roles/useRoles';
import type { Role, RolePayload } from '../../features/roles/types';
import { ConfirmDialog } from '../../components/shared';
import { RoleFormDialog } from './RoleFormDialog';
import { RoleDetailsDialog } from './RoleDetailsDialog';
import { PROFILE_LABELS } from '../../constants/permissions';
import { useAuth } from '../../features/auth/useAuth';

interface RolesTabProps {
  onViewRoleUsers?: (roleId: number) => void;
  onCreateUserWithRole?: (roleId: number) => void;
}

export function RolesTab({ onViewRoleUsers, onCreateUserWithRole }: RolesTabProps) {
  const { user: currentUser } = useAuth();
  const isAdminGeneral = currentUser?.isAdminGeneral ?? false;

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [toDeleteRole, setToDeleteRole] = useState<Role | null>(null);
  const [detailsRole, setDetailsRole] = useState<Role | null>(null);
  const [createdRolePrompt, setCreatedRolePrompt] = useState<Role | null>(null);

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
      createRole.mutate(payload, {
        onSuccess: (newRole) => {
          setFormOpen(false);
          if (onCreateUserWithRole) {
            setCreatedRolePrompt(newRole);
          }
        },
      });
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
      ) : !isLoading && roles.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center" justifyContent="center">
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
              <SecurityIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Aucun rôle disponible
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Aucun rôle ni profil d’accès n'est actuellement configuré.
              </Typography>
            </Box>
            {isAdminGeneral && (
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Ajouter un rôle sur mesure
              </Button>
            )}
          </Stack>
        </Paper>
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

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5, pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon fontSize="small" />}
                      onClick={() => setDetailsRole(role)}
                    >
                      Permissions
                    </Button>

                    {isAdminGeneral && !role.isSystem && (
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => handleOpenEdit(role)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            role.userCount > 0
                              ? `Ce rôle est attribué à ${role.userCount} utilisateur(s) et ne peut pas être supprimé`
                              : 'Supprimer'
                          }
                        >
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
                      </Stack>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <RoleDetailsDialog
        open={Boolean(detailsRole)}
        role={detailsRole}
        onClose={() => setDetailsRole(null)}
        onFilterUsers={onViewRoleUsers}
      />

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

      <ConfirmDialog
        open={Boolean(createdRolePrompt)}
        title="Rôle créé avec succès"
        severity="info"
        description={
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Le rôle sur mesure <strong>{createdRolePrompt?.nom}</strong> a été créé.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conformément à l’architecture de TRANSiVO, les permissions ne sont pas partagées par le rôle
              mais configurées individuellement par utilisateur.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
              Souhaitez-vous créer un utilisateur avec ce rôle dès maintenant ?
            </Typography>
          </Box>
        }
        confirmLabel="Créer un utilisateur"
        cancelLabel="Plus tard"
        onConfirm={() => {
          if (createdRolePrompt && onCreateUserWithRole) {
            onCreateUserWithRole(createdRolePrompt.id);
          }
          setCreatedRolePrompt(null);
        }}
        onClose={() => setCreatedRolePrompt(null)}
      />
    </Box>
  );
}

