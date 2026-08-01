import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';
import { useCancelVersement } from '../../features/paiements-employes/usePaiementsEmployes';
import type { VersementView } from '../../features/paiements-employes/types';
import { notify } from '../../utils/notify';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';

interface CancelVersementDialogProps {
  open: boolean;
  idPaiementEmploye: number | null;
  versement: VersementView | null;
  onClose: () => void;
}

export function CancelVersementDialog({
  open,
  idPaiementEmploye,
  versement,
  onClose,
}: CancelVersementDialogProps) {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  const cancelMutation = useCancelVersement();

  const [motifAnnulation, setMotifAnnulation] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!idPaiementEmploye || !versement) return null;

  const handleClose = () => {
    setMotifAnnulation('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!motifAnnulation || !motifAnnulation.trim()) {
      setErrorMsg('Le motif d’annulation est obligatoire');
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        idPaiementEmploye,
        versementId: versement.id,
        data: {
          motifAnnulation: motifAnnulation.trim(),
        },
      });

      notify.success('Versement annulé avec succès');
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de l’annulation du versement.';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="error" />
        Annulation du versement
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Versement à annuler
            </Typography>
            <Typography variant="h6" fontWeight={700} color="error.main">
              {versement.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date: {versement.dateVersement} — Mode: {versement.modePaiement}
            </Typography>
            {versement.referenceExterne && (
              <Typography variant="caption" display="block" color="text.secondary">
                Réf: {versement.referenceExterne}
              </Typography>
            )}
          </Paper>

          <Alert severity="warning" sx={{ mb: 2 }}>
            L’annulation du versement réajustera immédiatement le solde restant et le statut financier de l’engagement.
          </Alert>

          <TextField
            label="Motif d’annulation *"
            value={motifAnnulation}
            onChange={(e) => setMotifAnnulation(e.target.value)}
            fullWidth
            multiline
            rows={3}
            required
            placeholder="Ex: Chèque rejeté par la banque, erreur de saisie, remboursement client..."
            error={!motifAnnulation.trim() && errorMsg !== null}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={cancelMutation.isPending}>
            Conserver le versement
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={cancelMutation.isPending || !motifAnnulation.trim()}
            startIcon={cancelMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Confirmer l’annulation
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
