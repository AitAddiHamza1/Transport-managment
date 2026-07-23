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
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import { useState } from 'react';
import { Client, ClientStatut } from '../../features/clients/types';
import { Can } from '../../components/shared/Can';

interface ClientMobileListProps {
  clients: Client[];
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onChangeStatus: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const STATUT_CONFIG: Record<ClientStatut, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIF: { label: 'Actif', color: 'success' },
  INACTIF: { label: 'Inactif', color: 'warning' },
  BLOQUE: { label: 'Bloqué', color: 'error' },
};

export function ClientMobileList({
  clients,
  onView,
  onEdit,
  onChangeStatus,
  onDelete,
}: ClientMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedClient(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {clients.map((c) => {
        const statusCfg = STATUT_CONFIG[c.statut] || { label: c.statut, color: 'default' as any };
        return (
          <Card key={c.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                    <BusinessIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {c.nomEntreprise}
                    </Typography>
                    {c.ice && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        ICE: {c.ice}
                      </Typography>
                    )}
                    {c.telephone && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        <PhoneIcon fontSize="inherit" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {c.telephone}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
                <IconButton size="small" onClick={(e) => handleOpenMenu(e, c)}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" variant="filled" />
                <Typography variant="caption" fontWeight={600} color="primary.main">
                  Plafond: {c.limiteCredit.toLocaleString()} MAD
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedClient) onView(selectedClient);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="clients" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedClient) onEdit(selectedClient);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedClient) onChangeStatus(selectedClient);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><AutorenewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Changer statut</ListItemText>
          </MenuItem>
        </Can>

        <Can module="clients" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedClient) onDelete(selectedClient);
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
