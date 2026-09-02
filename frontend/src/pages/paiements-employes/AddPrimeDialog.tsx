import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useCreatePrime } from '../../features/paiements-employes/usePaiementsEmployes';
import type { PaiementEmployeView } from '../../features/paiements-employes/types';
import { notify } from '../../utils/notify';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';
import { formatPeriodeFr } from './utils';

interface AddPrimeDialogProps {
  open: boolean;
  paiement: PaiementEmployeView | null;
  onClose: () => void;
}

export function AddPrimeDialog({ open, paiement, onClose }: AddPrimeDialogProps) {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  const createPrimeMutation = useCreatePrime();

  const [montant, setMontant] = useState<string>('');
  const [datePrime, setDatePrime] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [motif, setMotif] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (paiement) {
      setMontant('');
      setDatePrime(new Date().toISOString().split('T')[0]);
      setMotif('');
      setErrorMsg(null);
    }
  }, [paiement, open]);

  if (!paiement) return null;

  const empName = paiement.employe
    ? `${paiement.employe.nom} ${paiement.employe.prenom}`
    : `Employé #${paiement.idEmploye}`;

  const montantNum = parseFloat(montant) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(montantNum) || montantNum <= 0) {
      setErrorMsg('Le montant de la prime doit être supérieur à 0');
      return;
    }

    if (!datePrime) {
      setErrorMsg('La date de la prime est obligatoire');
      return;
    }

    try {
      await createPrimeMutation.mutateAsync({
        idPaiementEmploye: paiement.id,
        data: {
          montant: montantNum,
          datePrime,
          motif: motif.trim() || undefined,
        },
      });

      notify.success('Prime ajoutée avec succès');
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de l’ajout de la prime.';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter une prime / bonus</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {/* Context Banner */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
              {paiement.numeroPaiement} — {formatPeriodeFr(paiement.periode)}
            </Typography>
            <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
              {empName}
            </Typography>
          </Paper>

          <Grid container spacing={2}>
            {/* Montant Prime */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label={`Montant de la prime (${currency}) *`}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>

            {/* Date Prime */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date de la prime *"
                value={datePrime}
                onChange={(e) => setDatePrime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Motif */}
            <Grid item xs={12}>
              <TextField
                label="Motif / Précisions"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                fullWidth
                placeholder="Ex: Prime de performance, bonus annuel, gratification..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={createPrimeMutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createPrimeMutation.isPending}
            startIcon={createPrimeMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            Enregistrer la prime
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
