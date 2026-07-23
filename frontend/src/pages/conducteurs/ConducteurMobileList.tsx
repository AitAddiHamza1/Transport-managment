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
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import { useState } from 'react';
import { Conducteur, ConducteurStatut } from '../../features/conducteurs/types';
import { Can } from '../../components/shared/Can';

interface ConducteurMobileListProps {
  drivers: Conducteur[];
  onView: (driver: Conducteur) => void;
  onEdit: (driver: Conducteur) => void;
  onChangeStatus: (driver: Conducteur) => void;
  onDelete: (driver: Conducteur) => void;
}

const STATUT_CONFIG: Record<ConducteurStatut, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  DISPONIBLE: { label: 'Disponible', color: 'success' },
  EN_VOYAGE: { label: 'En voyage', color: 'info' },
  INDISPONIBLE: { label: 'Indisponible', color: 'warning' },
  INACTIF: { label: 'Inactif', color: 'error' },
};

export function ConducteurMobileList({
  drivers,
  onView,
  onEdit,
  onChangeStatus,
  onDelete,
}: ConducteurMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDriver, setSelectedDriver] = useState<Conducteur | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, driver: Conducteur) => {
    setAnchorEl(event.currentTarget);
    setSelectedDriver(driver);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedDriver(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {drivers.map((d) => {
        const statusCfg = STATUT_CONFIG[d.statut] || { label: d.statut, color: 'default' as any };
        return (
          <Card key={d.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {d.nomConducteur}
                    </Typography>
                    {d.telephone && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        <PhoneIcon fontSize="inherit" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {d.telephone}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
                <IconButton size="small" onClick={(e) => handleOpenMenu(e, d)}>
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
            if (selectedDriver) onView(selectedDriver);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="conducteurs" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedDriver) onEdit(selectedDriver);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedDriver) onChangeStatus(selectedDriver);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><AutorenewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Changer statut</ListItemText>
          </MenuItem>
        </Can>

        <Can module="conducteurs" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedDriver) onDelete(selectedDriver);
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
