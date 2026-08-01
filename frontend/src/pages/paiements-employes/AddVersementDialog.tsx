import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useCreateVersement } from '../../features/paiements-employes/usePaiementsEmployes';
import type { PaiementEmployeView, PaiementModeEmploye } from '../../features/paiements-employes/types';
import { notify } from '../../utils/notify';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';
import { formatPeriodeFr } from './utils';

interface AddVersementDialogProps {
  open: boolean;
  paiement: PaiementEmployeView | null;
  onClose: () => void;
}

const MODES_PAIEMENT: { value: PaiementModeEmploye; label: string }[] = [
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
];

export function AddVersementDialog({ open, paiement, onClose }: AddVersementDialogProps) {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  const createVersementMutation = useCreateVersement();

  const [montant, setMontant] = useState<string>('');
  const [dateVersement, setDateVersement] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [modePaiement, setModePaiement] = useState<PaiementModeEmploye>('VIREMENT');
  const [referenceExterne, setReferenceExterne] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (paiement) {
      // Prefill full remaining balance
      setMontant(paiement.soldeRestant > 0 ? String(paiement.soldeRestant) : '');
      setDateVersement(new Date().toISOString().split('T')[0]);
      setModePaiement('VIREMENT');
      setReferenceExterne('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [paiement]);

  if (!paiement) return null;

  const empName = paiement.employe
    ? `${paiement.employe.nom} ${paiement.employe.prenom}`
    : `Employé #${paiement.idEmploye}`;

  const montantNum = parseFloat(montant) || 0;
  const nouveauSolde = Math.max(0, Math.round((paiement.soldeRestant - montantNum) * 100) / 100);
  const isOverpayment = montantNum > paiement.soldeRestant;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(montantNum) || montantNum <= 0) {
      setErrorMsg('Le montant du versement doit être supérieur à 0');
      return;
    }

    if (isOverpayment) {
      setErrorMsg(
        `Le versement (${montantNum.toLocaleString('fr-FR')} ${currency}) dépasse le solde restant (${paiement.soldeRestant.toLocaleString('fr-FR')} ${currency})`,
      );
      return;
    }

    if (!dateVersement) {
      setErrorMsg('La date de versement est obligatoire');
      return;
    }

    try {
      await createVersementMutation.mutateAsync({
        idPaiementEmploye: paiement.id,
        data: {
          montant: montantNum,
          dateVersement,
          modePaiement,
          referenceExterne: referenceExterne.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      notify.success('Versement enregistré avec succès');
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de l’enregistrement du versement.';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter un versement de salaire</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {/* Context Header */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
              {paiement.numeroPaiement} — {formatPeriodeFr(paiement.periode)}
            </Typography>
            <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
              {empName}
            </Typography>

            <Grid container spacing={1} sx={{ mt: 1 }}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Montant dû
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {paiement.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Déjà payé
                </Typography>
                <Typography variant="body2" fontWeight={700} color="success.main">
                  {paiement.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Solde restant
                </Typography>
                <Typography variant="body2" fontWeight={700} color="warning.main">
                  {paiement.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            {/* Montant */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label={`Montant du versement (${currency}) *`}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01', max: paiement.soldeRestant }}
                error={isOverpayment}
                helperText={isOverpayment ? 'Dépassement du solde restant !' : ''}
              />
            </Grid>

            {/* Date Versement */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date de versement *"
                value={dateVersement}
                onChange={(e) => setDateVersement(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Mode de paiement */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Mode de paiement *"
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value as PaiementModeEmploye)}
                fullWidth
              >
                {MODES_PAIEMENT.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Référence externe */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Référence externe (Chèque/Virement)"
                value={referenceExterne}
                onChange={(e) => setReferenceExterne(e.target.value)}
                fullWidth
                placeholder="Ex: VIR-998877"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                label="Notes du versement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Remarques spécifiques à cette opération..."
              />
            </Grid>
          </Grid>

          {/* Balance Preview */}
          {montantNum > 0 && !isOverpayment && (
            <Paper variant="outlined" sx={{ p: 1.5, mt: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  Nouveau solde restant après ce versement:
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {nouveauSolde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                </Typography>
              </Stack>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={createVersementMutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createVersementMutation.isPending || isOverpayment}
            startIcon={createVersementMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            Enregistrer le versement
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
