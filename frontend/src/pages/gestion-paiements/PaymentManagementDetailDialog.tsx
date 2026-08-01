import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  FinancialMovement,
  SOURCE_TYPE_LABELS,
} from '../../features/gestion-paiements/types';

interface PaymentManagementDetailDialogProps {
  open: boolean;
  movement: FinancialMovement | null;
  onClose: () => void;
}

export function PaymentManagementDetailDialog({
  open,
  movement,
  onClose,
}: PaymentManagementDetailDialogProps) {
  const navigate = useNavigate();

  if (!movement) return null;

  const numAmount = parseFloat(movement.amount);
  const formattedAmount = !isNaN(numAmount)
    ? numAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : movement.amount;

  const handleNavigateSource = () => {
    onClose();
    if (movement.sourceRoute) {
      navigate(movement.sourceRoute);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Mouvement financier #{movement.movementId}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={movement.direction === 'IN' ? 'Encaissement (IN)' : 'Décaissement (OUT)'}
              color={movement.direction === 'IN' ? 'success' : 'warning'}
              variant="outlined"
            />
            <Chip
              label={SOURCE_TYPE_LABELS[movement.sourceType] || movement.sourceType}
              color="primary"
            />
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Amount & Direction Card */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', backgroundColor: '#f8fafc' }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                Montant & Mode de paiement
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Montant :
                  </Typography>

                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={movement.direction === 'IN' ? 'success.main' : 'warning.main'}
                  >
                    {movement.direction === 'IN' ? '+' : '-'} {formattedAmount} {movement.currency}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalanceIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Mode de paiement :
                  </Typography>
                  <Chip label={movement.paymentMethod} size="small" variant="outlined" />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Date d'opération :
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {new Date(movement.date).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Party & Document Card */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', backgroundColor: '#f8fafc' }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                Tiers & Document rattaché
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Tiers ({movement.party.type}) :
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {movement.party.name}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Référence :
                  </Typography>

                  <Typography variant="body2" fontWeight="bold">
                    {movement.reference}
                  </Typography>
                </Box>

                {movement.externalReference && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Réf externe : {movement.externalReference}
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Cancellation Alert if Cancelled */}
          {movement.isCancelled && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WarningAmberIcon color="error" />
                  <Typography variant="subtitle2" color="error" fontWeight="bold">
                    Mouvement Annulé
                  </Typography>

                </Stack>
                {movement.cancelledAt && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Date d'annulation : {new Date(movement.cancelledAt).toLocaleString('fr-FR')}
                  </Typography>
                )}
                {movement.cancellationReason && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Motif : {movement.cancellationReason}
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Fermer</Button>

        <Button
          variant="contained"
          startIcon={<OpenInNewIcon />}
          onClick={handleNavigateSource}
        >
          Ouvrir le module source ({SOURCE_TYPE_LABELS[movement.sourceType]})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
