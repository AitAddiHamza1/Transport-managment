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
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useVoyageQuery } from '../../features/voyages/useVoyages';
import { VoyageStatut } from '../../features/voyages/types';

interface VoyageDetailDialogProps {
  open: boolean;
  voyageId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<VoyageStatut, { label: string; color: 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  PLANIFIE: { label: 'Planifié', color: 'info' },
  EN_COURS: { label: 'En cours', color: 'warning' },
  LIVRE: { label: 'Livré', color: 'success' },
  ANNULE: { label: 'Annulé', color: 'error' },
  FACTURE: { label: 'Facturé', color: 'secondary' },
};

export function VoyageDetailDialog({ open, voyageId, onClose }: VoyageDetailDialogProps) {
  const { data: voyage, isLoading, isError } = useVoyageQuery(voyageId);

  const statusCfg = voyage ? STATUT_CONFIG[voyage.statut] || { label: voyage.statut, color: 'default' as any } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <RouteIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Fiche Voyage #{voyage?.idVoyage || ''}
            </Typography>
            {voyage && (
              <Typography variant="caption" color="text.secondary">
                Type : {voyage.typeVoyage} {voyage.numeroCmr ? `• CMR: ${voyage.numeroCmr}` : ''}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Chargement des détails du voyage...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger les détails du voyage.
          </Typography>
        )}

        {voyage && statusCfg && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Statut opérationnel
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Montant du voyage
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <AttachMoneyIcon fontSize="small" color="action" />
                <Typography variant="body1" fontWeight={700} color="primary.main">
                  {voyage.montantVoyage.toLocaleString('fr-FR')} MAD
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Itinéraire de transport
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                {voyage.lieuChargement} ➔ {voyage.lieuDechargement}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Client partenaire
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <BusinessIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>{voyage.nomClient || 'Non attribué'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Conducteur principal
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">{voyage.nomConducteur || 'Non attribué'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Tracteur
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <LocalShippingIcon fontSize="small" color="action" />
                <Typography variant="body2">{voyage.tracteur || 'Non attribué'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Remorque
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{voyage.remorque || 'Aucune'}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Date de chargement
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2">{voyage.dateChargement || 'Non planifiée'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Numéro CMR
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <ReceiptLongIcon fontSize="small" color="action" />
                <Typography variant="body2">{voyage.numeroCmr || '—'}</Typography>
              </Stack>
            </Grid>
          </Grid>
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
