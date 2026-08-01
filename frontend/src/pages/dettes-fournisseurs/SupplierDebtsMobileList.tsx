import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCardIcon from '@mui/icons-material/AddCard';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { DetteFournisseurView } from '../../features/dettes-fournisseurs/types';

interface SupplierDebtsMobileListProps {
  dettes: DetteFournisseurView[];
  onView: (dette: DetteFournisseurView) => void;
  onEdit: (dette: DetteFournisseurView) => void;
  onDelete: (dette: DetteFournisseurView) => void;
  onAddPayment: (dette: DetteFournisseurView) => void;
}

export const SupplierDebtsMobileList: React.FC<SupplierDebtsMobileListProps> = ({
  dettes,
  onView,
  onEdit,
  onDelete,
  onAddPayment,
}) => {
  const theme = useTheme();

  const getStatusChip = (dette: DetteFournisseurView) => {
    if (dette.statutPaiement === 'PAYEE') {
      return <Chip label="PAYÉE" color="success" size="small" variant="filled" />;
    }
    if (dette.statutPaiement === 'PARTIELLEMENT_PAYEE') {
      return <Chip label="PARTIELLE" color="warning" size="small" variant="filled" />;
    }
    return <Chip label="EN ATTENTE" color="info" size="small" variant="outlined" />;
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {dettes.map((dette) => (
        <Card
          key={dette.id}
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: dette.estEnRetard ? theme.palette.error.main : theme.palette.divider,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack spacing={1.5}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    {dette.numeroDette}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Réf: {dette.referenceFactureFournisseur || 'N/A'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {dette.estEnRetard && (
                    <Tooltip title={`En retard de ${dette.joursRetard} jour(s)`}>
                      <Chip
                        icon={<WarningAmberIcon style={{ fontSize: 14 }} />}
                        label={`Retard (${dette.joursRetard}j)`}
                        color="error"
                        size="small"
                      />
                    </Tooltip>
                  )}
                  {getStatusChip(dette)}
                </Stack>
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  {dette.nomFournisseurSnapshot}
                </Typography>
                {dette.categorie && (
                  <Typography variant="caption" color="text.secondary">
                    Catégorie: {dette.categorie}
                  </Typography>
                )}
              </Box>

              <Box display="flex" justifyContent="space-between" bgcolor="action.hover" p={1} borderRadius={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Montant Dû
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {dette.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary" display="block">
                    Solde Restant
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={dette.soldeRestant > 0 ? 'error.main' : 'success.main'}
                  >
                    {dette.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Échéance: {dette.dateEcheance}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" color="primary" onClick={() => onView(dette)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  {dette.soldeRestant > 0 && (
                    <Tooltip title="Ajouter un versement">
                      <IconButton size="small" color="success" onClick={() => onAddPayment(dette)}>
                        <AddCardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {dette.paiementsCount === 0 && (
                    <>
                      <IconButton size="small" color="info" onClick={() => onEdit(dette)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDelete(dette)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};
