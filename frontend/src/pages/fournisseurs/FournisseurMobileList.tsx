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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PhoneIcon from '@mui/icons-material/Phone';
import { useState } from 'react';
import { Fournisseur, FournisseurStatut } from '../../features/fournisseurs/types';
import { Can } from '../../components/shared/Can';

interface FournisseurMobileListProps {
  suppliers: Fournisseur[];
  onView: (supplier: Fournisseur) => void;
  onEdit: (supplier: Fournisseur) => void;
  onChangeStatus: (supplier: Fournisseur) => void;
  onDelete: (supplier: Fournisseur) => void;
}

const STATUT_CONFIG: Record<FournisseurStatut, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIF: { label: 'Actif', color: 'success' },
  INACTIF: { label: 'Inactif', color: 'warning' },
  BLOQUE: { label: 'Bloqué', color: 'error' },
};

export function FournisseurMobileList({
  suppliers,
  onView,
  onEdit,
  onChangeStatus,
  onDelete,
}: FournisseurMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Fournisseur | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, supplier: Fournisseur) => {
    setAnchorEl(event.currentTarget);
    setSelectedSupplier(supplier);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedSupplier(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {suppliers.map((s) => {
        const statusCfg = STATUT_CONFIG[s.statut] || { label: s.statut, color: 'default' as any };
        return (
          <Card key={s.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                    <StorefrontIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {s.nomFournisseur}
                    </Typography>
                    {s.ice && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        ICE: {s.ice}
                      </Typography>
                    )}
                    {s.telephone && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        <PhoneIcon fontSize="inherit" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {s.telephone}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
                <IconButton size="small" onClick={(e) => handleOpenMenu(e, s)}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" variant="filled" />
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedSupplier) onView(selectedSupplier);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="fournisseurs" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedSupplier) onEdit(selectedSupplier);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedSupplier) onChangeStatus(selectedSupplier);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><AutorenewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Changer statut</ListItemText>
          </MenuItem>
        </Can>

        <Can module="fournisseurs" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedSupplier) onDelete(selectedSupplier);
              handleCloseMenu();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Supprimer</ListItemText>
          </MenuItem>
        </Can>
      </Menu>
    </Stack>
  );
}
