import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { useState, MouseEvent } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import type { User, UserStatut } from '../../features/users/types';
import { PROFILE_LABELS } from '../../constants/permissions';
import { Can } from '../../components/shared';

const STATUT_COLOR: Record<UserStatut, 'success' | 'default' | 'warning'> = {
  ACTIF: 'success',
  INACTIF: 'default',
  SUSPENDU: 'warning',
};

interface UserMobileListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onChangeStatus: (user: User, newStatus: UserStatut) => void;
}

export function UserMobileList({
  users,
  onEdit,
  onDelete,
  onChangeStatus,
}: UserMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const handleOpenMenu = (event: MouseEvent<HTMLButtonElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setActiveUser(user);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveUser(null);
  };

  if (users.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucun utilisateur trouvé.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {users.map((user) => {
        const initials = user.nom
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        return (
          <Card key={user.id} variant="outlined">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: '0.875rem' }}>
                    {initials}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {user.nom}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {user.email}
                    </Typography>
                  </Box>
                </Stack>

                <IconButton size="small" onClick={(e) => handleOpenMenu(e, user)}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <Chip
                  size="small"
                  label={PROFILE_LABELS[user.role?.nom] ?? user.role?.nom ?? '—'}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={user.statut}
                  color={STATUT_COLOR[user.statut]}
                />
                {user.telephone && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {user.telephone}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {activeUser && (
          <>
            <Can module="utilisateurs" action="modifier">
              {activeUser.statut !== 'ACTIF' && (
                <MenuItem
                  onClick={() => {
                    onChangeStatus(activeUser, 'ACTIF');
                    handleClose();
                  }}
                >
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText>Activer</ListItemText>
                </MenuItem>
              )}
              {activeUser.statut !== 'INACTIF' && (
                <MenuItem
                  onClick={() => {
                    onChangeStatus(activeUser, 'INACTIF');
                    handleClose();
                  }}
                >
                  <ListItemIcon>
                    <BlockIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText>Désactiver</ListItemText>
                </MenuItem>
              )}
              {activeUser.statut !== 'SUSPENDU' && (
                <MenuItem
                  onClick={() => {
                    onChangeStatus(activeUser, 'SUSPENDU');
                    handleClose();
                  }}
                >
                  <ListItemIcon>
                    <PauseCircleIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText>Suspendre</ListItemText>
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  onEdit(activeUser);
                  handleClose();
                }}
              >
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Modifier</ListItemText>
              </MenuItem>
            </Can>

            <Can module="utilisateurs" action="supprimer">
              <MenuItem
                onClick={() => {
                  onDelete(activeUser);
                  handleClose();
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Supprimer</ListItemText>
              </MenuItem>
            </Can>
          </>
        )}
      </Menu>
    </Stack>
  );
}
