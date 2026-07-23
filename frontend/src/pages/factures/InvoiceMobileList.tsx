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
import ReceiptIcon from '@mui/icons-material/Receipt';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useState } from 'react';
import { Facture } from '../../features/factures/types';
import { Can } from '../../components/shared/Can';

interface InvoiceMobileListProps {
  factures: Facture[];
  onView: (facture: Facture) => void;
  onEdit: (facture: Facture) => void;
  onDelete: (facture: Facture) => void;
  onDownloadPdf: (facture: Facture) => void;
}

export function InvoiceMobileList({
  factures,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
}: InvoiceMobileListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, facture: Facture) => {
    setAnchorEl(event.currentTarget);
    setSelectedFacture(facture);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedFacture(null);
  };

  const getStatusChip = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return <Chip label="Payée" size="small" color="success" />;
      case 'PARTIELLEMENT_PAYEE':
        return <Chip label="Partiel" size="small" color="warning" />;
      case 'EN_RETARD':
        return <Chip label="En retard" size="small" color="error" />;
      case 'ANNULEE':
        return <Chip label="Annulée" size="small" color="default" />;
      default:
        return <Chip label="Émise" size="small" color="info" />;
    }
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {factures.map((facture) => (
        <Card key={facture.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {facture.numeroFacture}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Émise le {facture.dateFacture}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={(e) => handleOpenMenu(e, facture)}>
                <MoreVertIcon />
              </IconButton>
            </Stack>

            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <BusinessIcon fontSize="inherit" color="action" />
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {facture.nomClient}
                </Typography>
              </Stack>
              {facture.dateEcheance && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon fontSize="inherit" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Échéance : {facture.dateEcheance}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
              {getStatusChip(facture.statut)}
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                {(Number(facture.montantTotal) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            if (selectedFacture) onView(selectedFacture);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Détails</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedFacture) onDownloadPdf(selectedFacture);
            handleCloseMenu();
          }}
        >
          <ListItemIcon><PictureAsPdfIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>Télécharger PDF</ListItemText>
        </MenuItem>

        <Can module="factures" action="modifier">
          <MenuItem
            onClick={() => {
              if (selectedFacture) onEdit(selectedFacture);
              handleCloseMenu();
            }}
          >
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Modifier</ListItemText>
          </MenuItem>
        </Can>

        <Can module="factures" action="supprimer">
          <MenuItem
            onClick={() => {
              if (selectedFacture) onDelete(selectedFacture);
              handleCloseMenu();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Annuler la facture</ListItemText>
          </MenuItem>
        </Can>
      </Menu>
    </Stack>
  );
}
