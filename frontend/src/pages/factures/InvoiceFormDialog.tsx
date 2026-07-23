import {
  Autocomplete,
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
import { useState, useEffect, useMemo } from 'react';
import { CreateFacturePayload, Facture } from '../../features/factures/types';
import { useClientsQuery } from '../../features/clients/useClients';
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

  const [numeroFacture, setNumeroFacture] = useState('');
  const [nomClient, setNomClient] = useState('');
  const [idVoyage, setIdVoyage] = useState<number | null>(null);
  const [dateFacture, setDateFacture] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [joursEcheance, setJoursEcheance] = useState<number>(30);
  const [sousTotal, setSousTotal] = useState<string>('');
  const [tauxTva, setTauxTva] = useState<string>('20');
  const [montantEnLettres, setMontantEnLettres] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Lookups
  const { data: clientsData } = useClientsQuery({ page: 1, limit: 100 });
  const { data: voyagesData } = useVoyagesQuery({ page: 1, limit: 100 });

  const clientOptions = useMemo(
    () => (clientsData?.data || []).map((c) => c.nomEntreprise),
    [clientsData],
  );

  const voyageOptions = useMemo(
    () => (voyagesData?.data || []).map((v) => ({ id: v.idVoyage, label: `#${v.idVoyage} — ${v.lieuChargement} ➔ ${v.lieuDechargement} (${v.nomClient || 'Sans client'})` })),
    [voyagesData],
  );

  useEffect(() => {
    if (facture && open) {
      setNumeroFacture(facture.numeroFacture);
      setNomClient(facture.nomClient);
      setIdVoyage(facture.idVoyage);
      setDateFacture(facture.dateFacture);
      setJoursEcheance(facture.joursEcheance);
      setSousTotal(facture.sousTotal.toString());
      setTauxTva(facture.tauxTva.toString());
      setMontantEnLettres(facture.montantEnLettres || '');
      setNotes(facture.notes || '');
    } else if (open) {
      setNumeroFacture('');
      setNomClient('');
      setIdVoyage(null);
      setDateFacture(new Date().toISOString().split('T')[0]);
      setJoursEcheance(30);
      setSousTotal('');
      setTauxTva('20');
      setMontantEnLettres('');
      setNotes('');
    }
    setErrors({});
  }, [facture, open]);

  // Live financial preview
  const financialPreview = useMemo(() => {
    const ht = parseFloat(sousTotal);
    const tvaRate = parseFloat(tauxTva);
    if (!isNaN(ht) && ht >= 0) {
      const rate = !isNaN(tvaRate) && tvaRate >= 0 ? tvaRate : 20.0;
      const tva = Math.round(ht * (rate / 100) * 100) / 100;
      const ttc = Math.round((ht + tva) * 100) / 100;
      return {
        htFormatted: ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        tvaFormatted: tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        ttcFormatted: ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      };
    }
    return { htFormatted: '0.00', tvaFormatted: '0.00', ttcFormatted: '0.00' };
  }, [sousTotal, tauxTva]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nomClient.trim()) {
      newErrors.nomClient = 'Le nom du client est obligatoire';
    }

    const numHT = parseFloat(sousTotal);
    if (isNaN(numHT) || numHT < 0) {
      newErrors.sousTotal = 'Le sous-total HT doit être un nombre positif ou zéro';
    }

    const numTva = parseFloat(tauxTva);
    if (isNaN(numTva) || numTva < 0) {
      newErrors.tauxTva = 'Le taux de TVA doit être un nombre positif ou zéro';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      numeroFacture: numeroFacture.trim() || undefined,
      nomClient: nomClient.trim(),
      idVoyage: idVoyage ?? undefined,
      dateFacture: dateFacture || undefined,
      joursEcheance: joursEcheance,
      sousTotal: numHT,
      tauxTva: numTva,
      montantEnLettres: montantEnLettres.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {isEdit ? `Modifier la facture ${facture?.numeroFacture}` : 'Créer une nouvelle facture'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Informations client, voyage associé, montants HT/TVA et échéances
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Numéro de Facture */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Numéro de Facture (Optionnel - Auto-généré si vide)"
                placeholder="ex. FAC-2026-0001"
                value={numeroFacture}
                onChange={(e) => setNumeroFacture(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Client */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={clientOptions}
                value={nomClient}
                onChange={(_, newValue) => {
                  setNomClient(newValue || '');
                  if (errors.nomClient) setErrors((prev) => ({ ...prev, nomClient: '' }));
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Client facturé *"
                    error={Boolean(errors.nomClient)}
                    helperText={errors.nomClient}
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Voyage associé (Optionnel) */}
            <Grid item xs={12}>
              <Autocomplete
                options={voyageOptions}
                getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.label}
                value={voyageOptions.find((v) => v.id === idVoyage) || null}
                onChange={(_, newValue) => {
                  if (newValue && typeof newValue !== 'string') {
                    setIdVoyage(newValue.id);
                  } else {
                    setIdVoyage(null);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Voyage associé (Optionnel)"
                    placeholder="Sélectionner un voyage pour lier la prestation"
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Date de Facture */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date d'émission *"
                value={dateFacture}
                onChange={(e) => setDateFacture(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
            </Grid>

            {/* Jours d'échéance */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Délai d'échéance (Jours) *"
                value={joursEcheance}
                onChange={(e) => setJoursEcheance(parseInt(e.target.value, 10) || 30)}
                inputProps={{ min: '0' }}
                required
                fullWidth
              />
            </Grid>

            {/* Sous-total HT */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Sous-total HT (MAD) *"
                value={sousTotal}
                onChange={(e) => {
                  setSousTotal(e.target.value);
                  if (errors.sousTotal) setErrors((prev) => ({ ...prev, sousTotal: '' }));
                }}
                inputProps={{ step: '0.01', min: '0' }}
                error={Boolean(errors.sousTotal)}
                helperText={errors.sousTotal}
                required
                fullWidth
              />
            </Grid>

            {/* Taux TVA */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Taux TVA (%) *"
                value={tauxTva}
                onChange={(e) => {
                  setTauxTva(e.target.value);
                  if (errors.tauxTva) setErrors((prev) => ({ ...prev, tauxTva: '' }));
                }}
                inputProps={{ step: '0.1', min: '0' }}
                error={Boolean(errors.tauxTva)}
                helperText={errors.tauxTva}
                required
                fullWidth
              />
            </Grid>

            {/* Montant en lettres */}
            <Grid item xs={12}>
              <TextField
                label="Montant en toutes lettres (Optionnel)"
                placeholder="ex. Quinze mille dirhams"
                value={montantEnLettres}
                onChange={(e) => setMontantEnLettres(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Notes / Observations */}
            <Grid item xs={12}>
              <TextField
                label="Notes / Conditions de paiement"
                multiline
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Calculated Financial Summary Preview */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Total HT</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {financialPreview.htFormatted} MAD
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Montant TVA ({tauxTva}%)</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="warning.main">
                      {financialPreview.tvaFormatted} MAD
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Montant Total TTC</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      {financialPreview.ttcFormatted} MAD
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button type="button" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} /> : null}
          >
            {isEdit ? 'Enregistrer les modifications' : 'Créer la facture'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
