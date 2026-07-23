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
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import EventIcon from '@mui/icons-material/Event';
import { useState } from 'react';
import { ChargeVehicule } from '../../features/charges-vehicules/types';
import { Can } from '../../components/shared/Can';

interface VehicleExpenseMobileListProps {
  expenses: ChargeVehicule[];
  onView: (expense: ChargeVehicule) => void;
  onEdit: (expense: ChargeVehicule) => void;
  onDelete: (expense: ChargeVehicule) => void;
}

export function VehicleExpenseMobileList({
  expenses,
  onView,
  onEdit,
  onDelete,
}: VehicleExpenseMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedExpense, setSelectedExpense] = useState<ChargeVehicule | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, expense: ChargeVehicule) => {
    setAnchorEl(event.currentTarget);
    setSelectedExpense(expense);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedExpense(null);
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {expenses.map((exp) => (
        <Card key={exp.idDepense} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                  <BuildIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {exp.categorieDepense}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Dépense #{exp.idDepense} {exp.typeFacture ? `• N° ${exp.typeFacture}` : ''}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={(e) => handleOpenMenu(e, exp)}>
                <MoreVertIcon />
              </IconButton>
            </Stack>

            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalShippingIcon fontSize="inherit" color="action" />
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {exp.immatriculation}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <EventIcon fontSize="inherit" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {exp.dateDepense}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={exp.categorieDepense} size="small" variant="outlined" color="primary" />
                {exp.hasReceipt && (
                  <Chip label="Reçu joint" size="small" color="success" variant="outlined" />
                )}
              </Stack>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                {exp.montant.toLocaleString('fr-FR')} MAD
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedExpense) onView(selectedExpense);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <Can module="depenses_vehicules" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedExpense) onEdit(selectedExpense);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
        </Can>

        <Can module="depenses_vehicules" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedExpense) onDelete(selectedExpense);
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
