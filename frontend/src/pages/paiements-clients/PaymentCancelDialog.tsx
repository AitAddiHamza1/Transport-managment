import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';
import { useCancelPaiementClient } from '../../features/paiements-clients/usePaiementsClients';
import type { PaiementClient } from '../../features/paiements-clients/types';

interface PaymentCancelDialogProps {
  open: boolean;
  payment: PaiementClient | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentCancelDialog({
  open,
  payment,
  onClose,
  onSuccess,
}: PaymentCancelDialogProps) {
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const cancelMutation = useCancelPaiementClient();

  const handleClose = () => {
    if (cancelMutation.isPending) return;
    setMotifAnnulation('');
    setErrorText(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    const trimmedReason = motifAnnulation.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setErrorText('Veuillez saisir un motif d’annulation valide (au moins 3 caractères).');
      return;
    }

    try {
      setErrorText(null);
      await cancelMutation.mutateAsync({
        id: payment.id,
        payload: { motifAnnulation: trimmedReason },
      });
      setMotifAnnulation('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorText(
        err?.response?.data?.message || 'Une erreur s’est produite lors de l’annulation du règlement.',
      );
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6" fontWeight={700}>
            Annuler le règlement REG-{payment.id.toString().padStart(4, '0')}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="warning">
              <strong>Attention :</strong> L'annulation conserve l'historique financier complet du règlement tout en rétablissant le solde de la créance. Cette opération ne supprime pas la trace de la transaction.
            </Alert>

            {errorText && <Alert severity="error">{errorText}</Alert>}

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Facture associée :
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {payment.numeroFacture}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Client :
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {payment.nomClient}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Mode de règlement :
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {payment.methodePaiement}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Montant du règlement :
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">
                    {payment.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                    {payment.devise || 'MAD'}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            <TextField
              label="Motif d'annulation"
              placeholder="Saisissez la raison de l'annulation..."
              multiline
              rows={3}
              value={motifAnnulation}
              onChange={(e) => {
                setMotifAnnulation(e.target.value);
                if (errorText) setErrorText(null);
              }}
              required
              fullWidth
              disabled={cancelMutation.isPending}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={cancelMutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={cancelMutation.isPending || !motifAnnulation.trim()}
            startIcon={
              cancelMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {cancelMutation.isPending ? 'Annulation...' : 'Confirmer l’annulation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
