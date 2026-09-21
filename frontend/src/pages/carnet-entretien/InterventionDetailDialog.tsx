import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventIcon from '@mui/icons-material/Event';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate } from 'react-router-dom';

import { MaintenanceIntervention, MaintenanceStatus } from '../../features/carnet-entretien/types';

interface InterventionDetailDialogProps {
  open: boolean;
  intervention: MaintenanceIntervention | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  MaintenanceStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  OK: { label: 'OK', color: 'success' },
  UPCOMING: { label: 'À venir', color: 'warning' },
  DUE: { label: 'Échéance', color: 'warning' },
  OVERDUE: { label: 'En retard', color: 'error' },
};

export function InterventionDetailDialog({
  open,
  intervention,
  onClose,
}: InterventionDetailDialogProps) {
  const navigate = useNavigate();

  if (!intervention) return null;

  const statusCfg = STATUS_CONFIG[intervention.statut] || {
    label: intervention.statut,
    color: 'default',
  };

  const formatKm = (km: number | null) =>
    km !== null && km !== undefined ? `${km.toLocaleString('fr-FR')} km` : 'Non renseigné';

  const formatAmount = (montant: number | null) =>
    montant !== null && montant !== undefined
      ? `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
      : '—';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BuildIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              Détail de l'intervention #{intervention.id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {intervention.immatriculation} — {intervention.libelle}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {/* Main Status & Header Box */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Statut de maintenance
                </Typography>
                <Chip
                  label={statusCfg.label}
                  color={statusCfg.color}
                  size="small"
                  sx={{ fontWeight: 700, mt: 0.5 }}
                />
              </Box>

              {intervention.ruleNom && (
                <Box text-align="right">
                  <Typography variant="caption" color="text.secondary" display="block">
                    Règle appliquée
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                    {intervention.ruleNom} ({intervention.ruleCode})
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Key Information Grid */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Véhicule
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {intervention.immatriculation}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Date de l'intervention
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {intervention.dateIntervention}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Kilométrage réalisé
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatKm(intervention.kilometrageRealise)}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Kilométrage actuel (Véhicule)
              </Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {formatKm(intervention.currentVehicleMileage)}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Prochaine échéance kilométrique
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatKm(intervention.prochainKmEcheance)}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Prochaine date d'échéance
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {intervention.prochaineDateEcheance || 'Aucune date'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Kilomètres restants
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                color={
                  intervention.remainingKm !== null && intervention.remainingKm < 0
                    ? 'error.main'
                    : 'success.main'
                }
              >
                {intervention.remainingKm !== null
                  ? intervention.remainingKm < 0
                    ? `${Math.abs(intervention.remainingKm).toLocaleString('fr-FR')} km de retard`
                    : `${intervention.remainingKm.toLocaleString('fr-FR')} km restants`
                  : '—'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Jours restants
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                color={
                  intervention.remainingDays !== null && intervention.remainingDays < 0
                    ? 'error.main'
                    : 'success.main'
                }
              >
                {intervention.remainingDays !== null
                  ? intervention.remainingDays < 0
                    ? `${Math.abs(intervention.remainingDays)} jours de retard`
                    : `${intervention.remainingDays} jours restants`
                  : '—'}
              </Typography>
            </Grid>
          </Grid>

          {/* Financial charge reference */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', borderColor: 'primary.light' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ReceiptIcon color="primary" />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Charge véhicule associée
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {intervention.idDepenseVehicule
                      ? `Dépense #${intervention.idDepenseVehicule}`
                      : 'Créée via la charge véhicule'}
                    {intervention.depenseDate && ` — Date: ${intervention.depenseDate}`}
                    {intervention.depenseMontant !== null && ` — Montant: ${formatAmount(intervention.depenseMontant)}`}
                  </Typography>
                </Box>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon fontSize="small" />}
                onClick={() => {
                  onClose();
                  navigate('/charges-vehicules');
                }}
              >
                Voir la charge véhicule
              </Button>
            </Stack>
          </Paper>

          {/* Notes */}
          {intervention.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Notes & Remarques
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {intervention.notes}
                </Typography>
              </Paper>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          startIcon={<OpenInNewIcon fontSize="small" />}
          onClick={() => {
            onClose();
            navigate('/charges-vehicules');
          }}
        >
          Voir la charge véhicule
        </Button>
        <Button variant="contained" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
