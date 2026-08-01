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
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import { useState } from 'react';
import { Vehicule, VehiculeStatut } from '../../features/vehicles/types';
import { Can } from '../../components/shared/Can';

interface VehicleMobileListProps {
  vehicles: Vehicule[];
  onView: (vehicle: Vehicule) => void;
  onEdit: (vehicle: Vehicule) => void;
  onChangeStatus: (vehicle: Vehicule) => void;
  onDelete: (vehicle: Vehicule) => void;
}

const STATUT_CONFIG: Record<VehiculeStatut, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  DISPONIBLE: { label: 'Disponible', color: 'success' },
  EN_VOYAGE: { label: 'En voyage', color: 'info' },
  MAINTENANCE: { label: 'Maintenance', color: 'warning' },
  HORS_SERVICE: { label: 'Hors service', color: 'error' },
};

export function VehicleMobileList({
  vehicles,
  onView,
  onEdit,
  onChangeStatus,
  onDelete,
}: VehicleMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicule | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, vehicle: Vehicule) => {
    setAnchorEl(event.currentTarget);
    setSelectedVehicle(vehicle);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedVehicle(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {vehicles.map((v) => {
        const statusCfg = STATUT_CONFIG[v.statut] || { label: v.statut, color: 'default' as any };
        return (
          <Card key={v.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                    <DirectionsBusIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {v.immatriculation}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {v.marque} {v.modele ? `• ${v.modele}` : ''}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={(e) => handleOpenMenu(e, v)}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" variant="filled" />
                <Chip label={v.typeVehicule} size="small" variant="outlined" />
                {v.capaciteCharge !== null && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {v.capaciteCharge} T
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedVehicle) onView(selectedVehicle);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="vehicules" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedVehicle) onEdit(selectedVehicle);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedVehicle) onChangeStatus(selectedVehicle);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><AutorenewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Changer statut</ListItemText>
          </MenuItem>
        </Can>

        <Can module="vehicules" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedVehicle) onDelete(selectedVehicle);
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
