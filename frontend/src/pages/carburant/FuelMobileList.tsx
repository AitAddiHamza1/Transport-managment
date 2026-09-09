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
import DeleteIcon from '@mui/icons-material/Delete';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import SpeedIcon from '@mui/icons-material/Speed';
import { useState } from 'react';
import { BonCarburant } from '../../features/carburant/types';
import { Can } from '../../components/shared/Can';

interface FuelMobileListProps {
  bons: BonCarburant[];
  onView: (bon: BonCarburant) => void;
  onEdit: (bon: BonCarburant) => void;
  onDelete: (bon: BonCarburant) => void;
}

export function FuelMobileList({
  bons,
  onView,
  onEdit,
  onDelete,
}: FuelMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBon, setSelectedBon] = useState<BonCarburant | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, bon: BonCarburant) => {
    setAnchorEl(event.currentTarget);
    setSelectedBon(bon);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedBon(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {bons.map((bon) => {
        const driverName = bon.driverName || bon.nomConducteur;
        const statusLabel =
          bon.status === 'STOCK_INITIAL'
            ? 'Stock initial'
            : bon.status === 'CALCULE'
              ? 'Calculé'
              : 'Non calculable';

        const statusColor =
          bon.status === 'STOCK_INITIAL'
            ? 'info'
            : bon.status === 'CALCULE'
              ? 'success'
              : 'default';

        return (
          <Card key={bon.idBon} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'warning.main', width: 42, height: 42 }}>
                    <LocalGasStationIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {bon.numeroBon ? `#${bon.numeroBon}` : `Bon #${bon.idBon}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {bon.nomStation ? `Station : ${bon.nomStation}` : 'Plein carburant'}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Chip label={statusLabel} size="small" color={statusColor as any} variant="outlined" />
                  <IconButton size="small" onClick={(e) => handleOpenMenu(e, bon)}>
                    <MoreVertIcon />
                  </IconButton>
                </Stack>
              </Stack>

              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalShippingIcon fontSize="inherit" color="action" />
                  <Typography variant="caption" fontWeight={600} color="text.primary">
                    {bon.immatriculation}
                  </Typography>
                </Stack>
                {driverName && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="inherit" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {driverName}
                    </Typography>
                  </Stack>
                )}
                {bon.kilometrage !== null && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SpeedIcon fontSize="inherit" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {bon.kilometrage.toLocaleString('fr-FR')} km {bon.distance !== null ? `(+${bon.distance} km)` : ''}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon fontSize="inherit" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {bon.dateCarburant}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`${bon.litres} L`} size="small" color="warning" variant="outlined" />
                  {bon.consommationL100 !== null && (
                    <Chip label={`${bon.consommationL100} L/100`} size="small" color="primary" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  {Number(bon.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedBon) onView(selectedBon);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="bons_carburant" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedBon) onEdit(selectedBon);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
        </Can>

        <Can module="bons_carburant" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedBon) onDelete(selectedBon);
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
