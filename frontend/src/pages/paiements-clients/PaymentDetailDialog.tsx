import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { usePaiementClientDetail } from '../../features/paiements-clients/usePaiementsClients';

interface PaymentDetailDialogProps {
  open: boolean;
  paymentId: number | null;
  onClose: () => void;
}

export function PaymentDetailDialog({ open, paymentId, onClose }: PaymentDetailDialogProps) {
  const { data: paiement, isLoading } = usePaiementClientDetail(paymentId);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Règlement client REG-{(paymentId ?? 0).toString().padStart(4, '0')}
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : paiement ? (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">
                Montant réglé
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>
                {paiement.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
              </Typography>
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  N° Facture
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {paiement.numeroFacture}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {paiement.nomClient}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Date de règlement
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {paiement.datePaiement}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Mode de règlement
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={paiement.methodePaiement} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>
              </Grid>
            </Grid>

            {paiement.creance && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  État de la créance après ce règlement
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Solde restant : {paiement.creance.solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                  <Chip
                    label={paiement.creance.statutPaiement === 'PAYE' ? 'Réglé' : 'Partiel'}
                    color={paiement.creance.statutPaiement === 'PAYE' ? 'success' : 'warning'}
                    size="small"
                  />
                </Stack>
              </Paper>
            )}
          </Stack>
        ) : (
          <Typography variant="body1" color="error">
            Règlement introuvable.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
