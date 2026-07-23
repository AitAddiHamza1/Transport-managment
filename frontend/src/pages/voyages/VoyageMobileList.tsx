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
import RouteIcon from '@mui/icons-material/Route';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useState } from 'react';
import { Voyage, VoyageStatut } from '../../features/voyages/types';
import { Can } from '../../components/shared/Can';

interface VoyageMobileListProps {
  voyages: Voyage[];
  onView: (voyage: Voyage) => void;
  onEdit: (voyage: Voyage) => void;
  onChangeStatus: (voyage: Voyage) => void;
  onDelete: (voyage: Voyage) => void;
}

const STATUT_CONFIG: Record<VoyageStatut, { label: string; color: 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  PLANIFIE: { label: 'Planifié', color: 'info' },
  EN_COURS: { label: 'En cours', color: 'warning' },
  LIVRE: { label: 'Livré', color: 'success' },
  ANNULE: { label: 'Annulé', color: 'error' },
  FACTURE: { label: 'Facturé', color: 'secondary' },
};

export function VoyageMobileList({
  voyages,
  onView,
  onEdit,
  onChangeStatus,
  onDelete,
}: VoyageMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, voyage: Voyage) => {
    setAnchorEl(event.currentTarget);
    setSelectedVoyage(voyage);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedVoyage(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {voyages.map((v) => {
        const statusCfg = STATUT_CONFIG[v.statut] || { label: v.statut, color: 'default' as any };
        return (
          <Card key={v.idVoyage} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                    <RouteIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {v.lieuChargement} ➔ {v.lieuDechargement}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Voyage #{v.idVoyage} • {v.typeVoyage}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={(e) => handleOpenMenu(e, v)}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                {v.nomClient && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BusinessIcon fontSize="inherit" color="action" />
                    <Typography variant="caption" color="text.secondary">{v.nomClient}</Typography>
                  </Stack>
                )}
                {v.tracteur && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocalShippingIcon fontSize="inherit" color="action" />
                    <Typography variant="caption" color="text.secondary">{v.tracteur}</Typography>
                  </Stack>
                )}
                {v.nomConducteur && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="inherit" color="action" />
                    <Typography variant="caption" color="text.secondary">{v.nomConducteur}</Typography>
                  </Stack>
                )}
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  {v.montantVoyage.toLocaleString('fr-FR')} MAD
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedVoyage) onView(selectedVoyage);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="voyages" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedVoyage) onEdit(selectedVoyage);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedVoyage) onChangeStatus(selectedVoyage);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><AutorenewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Changer statut</ListItemText>
          </MenuItem>
        </Can>

        <Can module="voyages" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedVoyage) onDelete(selectedVoyage);
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
