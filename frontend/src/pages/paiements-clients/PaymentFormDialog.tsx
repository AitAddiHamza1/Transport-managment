import {
  Autocomplete,
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
import { useState, useEffect, useMemo } from 'react';
import { useCreancesQuery } from '../../features/creances/useCreances';
import { useCreatePaiementClient } from '../../features/paiements-clients/usePaiementsClients';
import type { CreanceClient } from '../../features/creances/types';
import type { PaiementMethode } from '../../features/paiements-clients/types';

interface PaymentFormDialogProps {
  open: boolean;
  preselectedNumeroFacture?: string;
  onClose: () => void;
}

const METHODES: { value: PaiementMethode; label: string }[] = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'EFFET', label: 'Effet de commerce' },
  { value: 'PRELEVEMENT', label: 'Prélèvement automatique' },
];

export function PaymentFormDialog({
  open,
  preselectedNumeroFacture,
  onClose,
}: PaymentFormDialogProps) {
  // Query unpaid receivables for dropdown selection
  const { data: creancesData, isLoading: isLoadingCreances } = useCreancesQuery({
    limit: 100,
  });

  const activeCreances = useMemo(() => {
    return (creancesData?.data || []).filter(
      (c: CreanceClient) => c.statutPaiement !== 'PAYE' && c.solde > 0,
    );
  }, [creancesData]);

  // Form state
  const [selectedNumeroFacture, setSelectedNumeroFacture] = useState<string>('');
  const [montantRecu, setMontantRecu] = useState<string>('');
  const [methodePaiement, setMethodePaiement] = useState<PaiementMethode>('VIREMENT');
  const [datePaiement, setDatePaiement] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreatePaiementClient();

  // Find currently selected receivable
  const selectedCreance = useMemo(() => {
    return (creancesData?.data || []).find(
      (c: CreanceClient) => c.numeroFacture.toUpperCase() === selectedNumeroFacture.toUpperCase(),
    );
  }, [creancesData, selectedNumeroFacture]);

  // Sync preselected invoice
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setDatePaiement(new Date().toISOString().split('T')[0]);
      if (preselectedNumeroFacture) {
        setSelectedNumeroFacture(preselectedNumeroFacture);
      } else if (activeCreances.length > 0) {
        setSelectedNumeroFacture(activeCreances[0].numeroFacture);
      } else {
        setSelectedNumeroFacture('');
      }
      setMontantRecu('');
      setMethodePaiement('VIREMENT');
    }
  }, [open, preselectedNumeroFacture, activeCreances]);

  // Financial preview calculation
  const parsedAmount = parseFloat(montantRecu) || 0;
  const currentSolde = selectedCreance?.solde ?? 0;
  const remainingAfterPayment = Math.max(0, currentSolde - parsedAmount);
  const isOverpaid = selectedCreance ? parsedAmount > currentSolde + 0.001 : false;
  const isInvalidAmount = parsedAmount <= 0 || isNaN(parsedAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedNumeroFacture) {
      setErrorMessage('Veuillez sélectionner une facture');
      return;
    }

    if (isInvalidAmount) {
      setErrorMessage('Le montant du règlement doit être un nombre supérieur à 0');
      return;
    }

    if (isOverpaid) {
      setErrorMessage(
        `Le montant saisi (${parsedAmount.toLocaleString()} MAD) dépasse le solde restant de la créance (${currentSolde.toLocaleString()} MAD)`,
      );
      return;
    }

    try {
      await createMutation.mutateAsync({
        numeroFacture: selectedNumeroFacture,
        nomClient: selectedCreance?.nomClient,
        datePaiement,
        montantRecu: parsedAmount,
        methodePaiement,
      });
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de l’enregistrement du règlement.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>Enregistrer un règlement client</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          {/* Invoice Selection */}
          <Autocomplete
            options={activeCreances}
            getOptionLabel={(option) => `${option.numeroFacture} — ${option.nomClient} (Solde: ${option.solde.toLocaleString()} MAD)`}
            value={selectedCreance || null}
            onChange={(_, newValue) => {
              if (newValue) {
                setSelectedNumeroFacture(newValue.numeroFacture);
                setMontantRecu(newValue.solde.toString());
              } else {
                setSelectedNumeroFacture('');
                setMontantRecu('');
              }
            }}
            loading={isLoadingCreances}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Facture / Créance à régler *"
                placeholder="Sélectionnez une facture..."
                fullWidth
                size="small"
              />
            )}
          />

          {/* Live Financial Card */}
          {selectedCreance && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {selectedCreance.nomClient}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Montant Facture TTC
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {selectedCreance.montantFacture.toLocaleString()} MAD
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Déjà encaissé
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="success.main">
                    {selectedCreance.montantRecu.toLocaleString()} MAD
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Solde actuel à régler
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="error.main">
                    {currentSolde.toLocaleString()} MAD
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Payment Form Fields */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Montant reçu (MAD) *"
                type="number"
                value={montantRecu}
                onChange={(e) => setMontantRecu(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ step: '0.01', min: '0.01' }}
                error={isOverpaid}
                helperText={isOverpaid ? 'Montant supérieur au solde !' : ''}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Mode de règlement *"
                value={methodePaiement}
                onChange={(e) => setMethodePaiement(e.target.value as PaiementMethode)}
                fullWidth
                size="small"
              >
                {METHODES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Date du règlement *"
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Live Remaining Balance Preview */}
          {selectedCreance && parsedAmount > 0 && !isOverpaid && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                Nouveau solde après ce règlement :{' '}
                <strong>{remainingAfterPayment.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</strong>
                {remainingAfterPayment === 0 && ' (Créance intégralement réglée)'}
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={createMutation.isPending}>
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={createMutation.isPending || isOverpaid || isInvalidAmount || !selectedNumeroFacture}
          startIcon={createMutation.isPending ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {createMutation.isPending ? 'Enregistrement...' : 'Valider le règlement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
