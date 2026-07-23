import {
  Avatar,
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
  Typography,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import RouteIcon from '@mui/icons-material/Route';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useDownloadFacturePdf, useFactureQuery } from '../../features/factures/useFactures';

interface InvoiceDetailDialogProps {
  open: boolean;
  factureId: number | null;
  onClose: () => void;
}

export function InvoiceDetailDialog({ open, factureId, onClose }: InvoiceDetailDialogProps) {
  const { data: facture, isLoading, isError } = useFactureQuery(factureId);
  const downloadPdfMutation = useDownloadFacturePdf();

  const getStatusChip = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return <Chip label="Payée" size="small" color="success" />;
      case 'PARTIELLEMENT_PAYEE':
        return <Chip label="Partiellement payée" size="small" color="warning" />;
      case 'EN_RETARD':
        return <Chip label="En retard" size="small" color="error" />;
      case 'ANNULEE':
        return <Chip label="Annulée" size="small" color="default" />;
      default:
        return <Chip label="Émise" size="small" color="info" />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
              <ReceiptIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Facture {facture?.numeroFacture || ''}
              </Typography>
              {facture && (
                <Typography variant="caption" color="text.secondary">
                  Émise le {facture.dateFacture}
                </Typography>
              )}
            </Box>
          </Stack>
          {facture && getStatusChip(facture.statut)}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Chargement des détails de la facture...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger les détails de la facture.
          </Typography>
        )}

        {facture && (
          <Stack spacing={2.5}>
            {/* Header info */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Client facturé</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="body1" fontWeight={700}>{facture.nomClient}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Date d'échéance</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="body2">{facture.dateEcheance || 'Non spécifiée'} ({facture.joursEcheance} jours)</Typography>
                </Stack>
              </Grid>
            </Grid>

            {/* Voyage summary if linked */}
            {facture.voyage && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Voyage associé #{facture.voyage.idVoyage}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <RouteIcon fontSize="small" color="primary" />
                  <Typography variant="body2" fontWeight={600}>
                    {facture.voyage.lieuChargement} ➔ {facture.voyage.lieuDechargement}
                  </Typography>
                  <Chip label={facture.voyage.statut} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                </Stack>
              </Paper>
            )}

            <Divider />

            {/* Financial summary */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Détail financier (MAD)
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Sous-total HT</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {facture.sousTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">TVA ({facture.tauxTva}%)</Typography>
                  <Typography variant="body1" fontWeight={600} color="warning.main">
                    {facture.montantTva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Montant TTC</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {(Number(facture.montantTotal) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {facture.montantEnLettres && (
              <Box>
                <Typography variant="caption" color="text.secondary">Montant en toutes lettres</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                  « {facture.montantEnLettres} »
                </Typography>
              </Box>
            )}

            {facture.notes && (
              <Box>
                <Typography variant="caption" color="text.secondary">Notes & Conditions</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {facture.notes}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {facture && (
          <Button
            variant="contained"
            color="primary"
            startIcon={downloadPdfMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
            disabled={downloadPdfMutation.isPending}
            onClick={() => downloadPdfMutation.mutate({ id: facture.id, numeroFacture: facture.numeroFacture })}
          >
            Télécharger PDF
          </Button>
        )}
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
