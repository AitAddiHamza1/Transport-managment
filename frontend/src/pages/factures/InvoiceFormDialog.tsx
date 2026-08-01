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
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { CreateFacturePayload, Facture } from '../../features/factures/types';
import { useVoyagesQuery } from '../../features/voyages/useVoyages';

interface InvoiceFormDialogProps {
  open: boolean;
  facture: Facture | null;
  onClose: () => void;
  onSubmit: (values: CreateFacturePayload) => Promise<void>;
  isLoading: boolean;
}

export function InvoiceFormDialog({
  open,
  facture,
  onClose,
  onSubmit,
  isLoading,
}: InvoiceFormDialogProps) {
  const isEdit = Boolean(facture);

  const [idVoyage, setIdVoyage] = useState<number | null>(null);
  const [dateFacture, setDateFacture] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [joursEcheance, setJoursEcheance] = useState<number>(30);
  const [tauxTva, setTauxTva] = useState<string>('20');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch Voyages for selection
  const { data: voyagesData, isLoading: isLoadingVoyages } = useVoyagesQuery({ page: 1, limit: 100 });
  const voyages = voyagesData?.data || [];

  const voyageOptions = useMemo(
    () =>
      voyages.map((v) => ({
        id: v.idVoyage,
        label: `#${v.idVoyage} — ${v.lieuChargement} ➔ ${v.lieuDechargement} (${v.client?.nomEntreprise || v.nomClient || 'Client non rattaché'})`,
        voyage: v,
      })),
    [voyages],
  );

  const selectedVoyage = useMemo(() => {
    if (!idVoyage) return null;
    return voyages.find((v) => v.idVoyage === idVoyage) || null;
  }, [idVoyage, voyages]);

  useEffect(() => {
    if (facture && open) {
      setIdVoyage(facture.idVoyage);
      setDateFacture(facture.dateFacture);
      setJoursEcheance(facture.joursEcheance);
      setTauxTva(facture.tauxTva.toString());
      setNotes(facture.notes || '');
    } else if (open) {
      setIdVoyage(null);
      setDateFacture(new Date().toISOString().split('T')[0]);
      setJoursEcheance(30);
      setTauxTva('20');
      setNotes('');
    }
    setErrors({});
    setErrorMessage(null);
  }, [facture, open]);

  // Derived Client and HT Amount
  const derivedClientName = selectedVoyage
    ? selectedVoyage.client?.nomEntreprise || selectedVoyage.nomClient || '—'
    : '—';

  const derivedHtAmount = selectedVoyage ? selectedVoyage.montantVoyage : 0;

  const financialPreview = useMemo(() => {
    const ht = derivedHtAmount;
    const tvaRate = parseFloat(tauxTva);
    const rate = !isNaN(tvaRate) && tvaRate >= 0 ? tvaRate : 20.0;
    const tva = Math.round(ht * (rate / 100) * 100) / 100;
    const ttc = Math.round((ht + tva) * 100) / 100;

    return {
      htFormatted: ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      tvaFormatted: tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      ttcFormatted: ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
    };
  }, [derivedHtAmount, tauxTva]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage(null);

    const newErrors: Record<string, string> = {};

    if (!idVoyage) {
      newErrors.idVoyage = 'Veuillez sélectionner un voyage à facturer';
    } else if (selectedVoyage && !selectedVoyage.idClient && !selectedVoyage.client) {
      newErrors.idVoyage = 'Le voyage sélectionné n’est pas rattaché à un client. Attribuez-lui un client avant de créer la facture.';
    }

    const numTva = parseFloat(tauxTva);
    if (isNaN(numTva) || numTva < 0 || numTva > 100) {
      newErrors.tauxTva = 'Le taux de TVA doit être compris entre 0 et 100%';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        idVoyage: idVoyage!,
        dateFacture: dateFacture || undefined,
        joursEcheance: Number(joursEcheance),
        tauxTva: numTva,
        notes: notes.trim() || undefined,
      });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erreur lors de la création de la facture.');
    }
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight="bold">
        {isEdit ? `Modifier la facture N° ${facture?.numeroFacture}` : 'Nouvelle Facture de Transport'}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {!isEdit && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Le numéro de la facture sera généré automatiquement à la création selon le format officiel (ex. <strong>F001/2026</strong>).
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Selection Voyage */}
            <Grid item xs={12}>
              <Autocomplete
                options={voyageOptions}
                getOptionLabel={(option) => option.label}
                value={voyageOptions.find((v) => v.id === idVoyage) || null}
                onChange={(_, newValue) => setIdVoyage(newValue ? newValue.id : null)}
                loading={isLoadingVoyages}
                disabled={isEdit || isLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Voyage associé à la facture *"
                    placeholder="Rechercher par N° voyage, trajet ou client..."
                    error={Boolean(errors.idVoyage)}
                    helperText={errors.idVoyage || 'Sélectionnez le voyage à facturer (le client et le montant HT sont dérivés du voyage)'}
                    required
                  />
                )}
              />
            </Grid>

            {/* Derived Client Name Preview */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Client facturé (Dérivé du voyage)"
                value={derivedClientName}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>

            {/* Derived HT Amount Preview */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Montant sous-total HT (Dérivé du voyage)"
                value={`${financialPreview.htFormatted} MAD`}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>

            {/* Date Facture */}
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                fullWidth
                label="Date d'émission *"
                value={dateFacture}
                onChange={(e) => setDateFacture(e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={isLoading}
                required
              />
            </Grid>

            {/* Jours Echeance */}
            <Grid item xs={12} sm={4}>
              <TextField
                type="number"
                fullWidth
                label="Délai d'échéance (Jours)"
                value={joursEcheance}
                onChange={(e) => setJoursEcheance(Number(e.target.value))}
                disabled={isLoading}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* Taux TVA */}
            <Grid item xs={12} sm={4}>
              <TextField
                type="number"
                fullWidth
                label="Taux de TVA (%) *"
                value={tauxTva}
                onChange={(e) => setTauxTva(e.target.value)}
                error={Boolean(errors.tauxTva)}
                helperText={errors.tauxTva}
                disabled={isLoading}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                required
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes / Remarques"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={2}
                disabled={isLoading}
                placeholder="Remarques particulières figurant sur la facture..."
              />
            </Grid>

            {/* Live Financial Totals Box */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                  Calcul automatique des montants
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Sous-total HT
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {financialPreview.htFormatted} MAD
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Montant TVA ({tauxTva}%)
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="text.secondary">
                      {financialPreview.tvaFormatted} MAD
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL TTC
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {financialPreview.ttcFormatted} MAD
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !idVoyage}
            startIcon={isLoading ? <CircularProgress size={18} /> : null}
          >
            {isEdit ? 'Enregistrer' : 'Générer la facture'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
