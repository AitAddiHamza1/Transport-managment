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
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import StoreIcon from '@mui/icons-material/Store';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import OpacityIcon from '@mui/icons-material/Opacity';
import SpeedIcon from '@mui/icons-material/Speed';
import CalculateIcon from '@mui/icons-material/Calculate';
import { useConsommationGasoilQuery } from '../../features/carburant/useCarburant';

interface FuelDetailDialogProps {
  open: boolean;
  bonId: number | null;
  onClose: () => void;
}

export function FuelDetailDialog({ open, bonId, onClose }: FuelDetailDialogProps) {
  const { data: bon, isLoading, isError } = useConsommationGasoilQuery(bonId);

  const driverName = bon ? bon.driverName || bon.nomConducteur : null;
  const statusLabel =
    bon?.status === 'STOCK_INITIAL'
      ? 'Stock initial'
      : bon?.status === 'CALCULE'
        ? 'Calculé'
        : 'Non calculable';

  const statusColor =
    bon?.status === 'STOCK_INITIAL'
      ? 'info'
      : bon?.status === 'CALCULE'
        ? 'success'
        : 'default';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: 'warning.main', width: 44, height: 44 }}>
              <LocalGasStationIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {bon?.numeroBon ? `Bon N° ${bon.numeroBon}` : `Bon de Carburant #${bon?.idBon || ''}`}
              </Typography>
              {bon && (
                <Typography variant="caption" color="text.secondary">
                  Immatriculation : {bon.immatriculation}
                </Typography>
              )}
            </Box>
          </Stack>
          {bon && <Chip label={statusLabel} color={statusColor as any} variant="outlined" size="small" />}
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
                Montant total
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <AttachMoneyIcon fontSize="small" color="action" />
                <Typography variant="body1" fontWeight={700} color="primary.main">
                  {Number(bon.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
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
                  {Number(bon.litres).toLocaleString('fr-FR')} L
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Prix unitaire / Litre
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                {Number(bon.prixParLitre).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MAD / L
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
                Kilométrage véhicule
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <SpeedIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={700}>
                  {bon.kilometrage !== null ? `${bon.kilometrage.toLocaleString('fr-FR')} km` : '—'}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Distance parcourue
              </Typography>
              <Typography variant="body2" fontWeight={700} color={bon.distance ? 'success.main' : 'text.secondary'} sx={{ mt: 0.5 }}>
                {bon.distance !== null ? `+${bon.distance.toLocaleString('fr-FR')} km` : '—'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Consommation moyenne
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <CalculateIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {bon.consommationL100 !== null ? `${bon.consommationL100} L/100km` : '—'}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Coût moyen au km
              </Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                {bon.coutKm !== null ? `${bon.coutKm} MAD / km` : '—'}
              </Typography>
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
                <Typography variant="body2">{driverName || '—'}</Typography>
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
