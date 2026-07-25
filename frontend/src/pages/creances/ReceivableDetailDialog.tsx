import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useCreanceDetail } from '../../features/creances/useCreances';
import { Can } from '../../components/shared/Can';

interface ReceivableDetailDialogProps {
  open: boolean;
  creanceId: number | null;
  onClose: () => void;
  onOpenPayment?: (numeroFacture: string) => void;
}

const STATUT_CONFIG: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'success' | 'default' }
> = {
  NON_PAYE: { label: 'Non payé', color: 'error' },
  PARTIEL: { label: 'Partiellement payé', color: 'warning' },
  PAYE: { label: 'Totalement payé', color: 'success' },
  EN_RETARD: { label: 'En retard de paiement', color: 'error' },
};

export function ReceivableDetailDialog({
  open,
  creanceId,
  onClose,
  onOpenPayment,
}: ReceivableDetailDialogProps) {
  const { data: creance, isLoading } = useCreanceDetail(creanceId);

  if (!open) return null;

  const cfg = creance ? STATUT_CONFIG[creance.statutPaiement] || { label: creance.statutPaiement, color: 'default' } : null;
  const isPaid = creance ? creance.statutPaiement === 'PAYE' || creance.solde <= 0 : true;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Détail de la créance {creance?.numeroFacture ? `— ${creance.numeroFacture}` : ''}
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : creance ? (
          <Stack spacing={3}>
            {/* Header info card */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {creance.nomClient}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} text-align={{ xs: 'left', sm: 'right' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Statut de la créance
                  </Typography>
                  {cfg && <Chip label={cfg.label} color={cfg.color} sx={{ fontWeight: 700, mt: 0.5 }} />}
                </Grid>
              </Grid>
            </Paper>

            {/* Financial summary grid */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Montant Facture TTC
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {creance.montantFacture.toLocaleString()} MAD
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Montant Encaisse
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {creance.montantRecu.toLocaleString()} MAD
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Solde Restant
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color={isPaid ? 'success.main' : 'error.main'}
                  >
                    {creance.solde.toLocaleString()} MAD
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Dates & Deadlines */}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Date d’émission
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {creance.dateEmission}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Délai accordé
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {creance.delaiPaiementJours} jours
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Date d’échéance
                </Typography>
                <Typography variant="body2" fontWeight={600} color={creance.statutPaiement === 'EN_RETARD' ? 'error.main' : 'text.primary'}>
                  {creance.dateEcheance || '—'}
                </Typography>
              </Grid>
            </Grid>

            <Divider />

            {/* Payment history table */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Historique des règlements ({creance.paiements?.length ?? 0})
              </Typography>

              {creance.paiements && creance.paiements.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>N° Règlement</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Mode</TableCell>
                        <TableCell align="right">Montant reçu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {creance.paiements.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>REG-{p.id.toString().padStart(4, '0')}</TableCell>
                          <TableCell>{p.datePaiement}</TableCell>
                          <TableCell>
                            <Chip label={p.methodePaiement} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {p.montantRecu.toLocaleString()} MAD
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', borderRadius: 2 }}>
                  <Typography variant="body2">Aucun règlement enregistré pour cette créance.</Typography>
                </Paper>
              )}
            </Box>
          </Stack>
        ) : (
          <Typography variant="body1" color="error">
            Créance introuvable.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
        {creance && !isPaid && onOpenPayment && (
          <Can module="paiements_clients" action="ajouter">
            <Button
              variant="contained"
              startIcon={<PaymentsIcon />}
              onClick={() => {
                onClose();
                onOpenPayment(creance.numeroFacture);
              }}
            >
              Enregistrer un règlement
            </Button>
          </Can>
        )}
      </DialogActions>
    </Dialog>
  );
}
