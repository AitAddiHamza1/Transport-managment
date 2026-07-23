import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import StoreIcon from '@mui/icons-material/Store';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import OpacityIcon from '@mui/icons-material/Opacity';
import { useConsommationGasoilQuery } from '../../features/carburant/useCarburant';

interface FuelDetailDialogProps {
  open: boolean;
  bonId: number | null;
  onClose: () => void;
}

export function FuelDetailDialog({ open, bonId, onClose }: FuelDetailDialogProps) {
  const { data: bon, isLoading, isError } = useConsommationGasoilQuery(bonId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'warning.main', width: 44, height: 44 }}>
            <LocalGasStationIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Fiche Bon de Carburant #{bon?.idBon || ''}
            </Typography>
            {bon && (
              <Typography variant="caption" color="text.secondary">
                Immatriculation : {bon.immatriculation}
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
              Chargement des détails du bon de carburant...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger les détails du bon de carburant.
          </Typography>
        )}

        {bon && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Montant total calculé
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <AttachMoneyIcon fontSize="small" color="action" />
                <Typography variant="body1" fontWeight={700} color="primary.main">
                  {bon.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Quantité plein
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <OpacityIcon fontSize="small" color="warning" />
                <Typography variant="body1" fontWeight={700}>
                  {bon.litres.toLocaleString('fr-FR')} L
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Prix unitaire / Litre
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                {bon.prixParLitre.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD / L
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Date du carburant
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2">{bon.dateCarburant}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Véhicule concerné
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <LocalShippingIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={700}>
                  {bon.immatriculation}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Conducteur
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">{bon.nomConducteur || '—'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Station-service / Fournisseur
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <StoreIcon fontSize="small" color="action" />
                <Typography variant="body2">{bon.nomStation || 'Non spécifiée'}</Typography>
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
