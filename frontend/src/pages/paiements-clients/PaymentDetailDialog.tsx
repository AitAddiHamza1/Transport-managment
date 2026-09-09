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
                {paiement.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paiement.devise || 'MAD'}
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
                  <Chip
                    label={paiement.methodePaiement === 'EFFET' ? 'Lettre de change' : paiement.methodePaiement}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Grid>
            </Grid>

            {paiement.devise === 'EUR' && paiement.tauxChange && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'info.light' }}>
                <Typography variant="subtitle2" fontWeight={700} color="info.main" gutterBottom>
                  Conversion devise — EUR → MAD
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Taux de change
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {paiement.tauxChange}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Source du taux
                    </Typography>
                    <Box sx={{ mt: 0.2 }}>
                      <Chip
                        label={paiement.estTauxManuel ? 'Taux manuel' : 'Bank Al-Maghrib'}
                        color={paiement.estTauxManuel ? 'warning' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Montant converti (MAD)
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="info.main">
                      {paiement.montantConvertiMad
                        ? `${paiement.montantConvertiMad.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                        : '—'}
                    </Typography>
                  </Grid>
                  {paiement.dateTauxUtilise && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Date publication du taux
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {paiement.dateTauxUtilise}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {paiement.methodePaiement === 'EFFET' && paiement.lettreDeChange && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'primary.light' }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                  Informations — Lettre de change
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">N°</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.numero}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Échéance</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.dateEcheance}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Montant en chiffres</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {paiement.lettreDeChange.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paiement.devise || 'MAD'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Bénéficiaire</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.beneficiaire}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Cause</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.cause}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Tiré</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.tireNom}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Adresse du tiré</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.tireAdresse}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {paiement.creance && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  État de la créance après ce règlement
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Solde restant : {paiement.creance.solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paiement.devise || 'MAD'}
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
