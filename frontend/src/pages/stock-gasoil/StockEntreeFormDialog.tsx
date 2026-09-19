import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { CreateStockEntreePayload, StockGasoilMovementView } from '../../features/stock-gasoil/types';

interface StockEntreeFormDialogProps {
  open: boolean;
  movement: StockGasoilMovementView | null;
  onClose: () => void;
  onSubmit: (values: CreateStockEntreePayload) => Promise<void>;
  isLoading: boolean;
}

export function StockEntreeFormDialog({
  open,
  movement,
  onClose,
  onSubmit,
  isLoading,
}: StockEntreeFormDialogProps) {
  const isEdit = Boolean(movement);

  const [dateMouvement, setDateMouvement] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [quantiteLitres, setQuantiteLitres] = useState<string>('');
  const [prixUnitaire, setPrixUnitaire] = useState<string>('');
  const [nomFournisseur, setNomFournisseur] = useState<string>('');
  const [referenceFacture, setReferenceFacture] = useState<string>('');
  const [remarques, setRemarques] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (movement && open) {
      setDateMouvement(movement.dateMouvement.split('T')[0]);
      setQuantiteLitres(movement.quantiteLitres);
      setPrixUnitaire(movement.prixUnitaire || '');
      setNomFournisseur(movement.nomFournisseur || '');
      setReferenceFacture(movement.referenceFacture || '');
      setRemarques(movement.remarques || '');
    } else if (open) {
      setDateMouvement(new Date().toISOString().split('T')[0]);
      setQuantiteLitres('');
      setPrixUnitaire('');
      setNomFournisseur('');
      setReferenceFacture('');
      setRemarques('');
    }
    setErrors({});
  }, [movement, open]);

  // Live total preview
  const previewTotal = useMemo(() => {
    const q = parseFloat(quantiteLitres);
    const p = parseFloat(prixUnitaire);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
      return (q * p).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '0,00';
  }, [quantiteLitres, prixUnitaire]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const q = parseFloat(quantiteLitres);
    if (isNaN(q) || q <= 0) {
      newErrors.quantiteLitres = 'La quantité doit être un nombre supérieur à 0 L';
    }

    const p = parseFloat(prixUnitaire);
    if (isNaN(p) || p <= 0) {
      newErrors.prixUnitaire = 'Le prix unitaire doit être un nombre supérieur à 0 MAD';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      dateMouvement,
      quantiteLitres: q,
      prixUnitaire: p,
      nomFournisseur: nomFournisseur.trim() || undefined,
      referenceFacture: referenceFacture.trim() || undefined,
      remarques: remarques.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {isEdit ? `Modifier l'entrée de stock #${movement?.idMouvement}` : 'Nouvelle entrée de stock (Citerne)'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Approvisionnement du stock de gasoil central de l’entreprise
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date d'entrée *"
                value={dateMouvement}
                onChange={(e) => setDateMouvement(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
            </Grid>

            {/* Fournisseur */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fournisseur / Origin"
                placeholder="ex. Afriquia Citerne"
                value={nomFournisseur}
                onChange={(e) => setNomFournisseur(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Quantite Litres */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Quantité (Litres) *"
                placeholder="ex. 1000"
                value={quantiteLitres}
                onChange={(e) => {
                  setQuantiteLitres(e.target.value);
                  if (errors.quantiteLitres) setErrors((prev) => ({ ...prev, quantiteLitres: '' }));
                }}
                inputProps={{ step: '0.01', min: '0.01' }}
                error={Boolean(errors.quantiteLitres)}
                helperText={errors.quantiteLitres}
                required
                fullWidth
              />
            </Grid>

            {/* Prix Unitaire */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Prix unitaire d'achat (MAD/L) *"
                placeholder="ex. 12.50"
                value={prixUnitaire}
                onChange={(e) => {
                  setPrixUnitaire(e.target.value);
                  if (errors.prixUnitaire) setErrors((prev) => ({ ...prev, prixUnitaire: '' }));
                }}
                inputProps={{ step: '0.001', min: '0.01' }}
                error={Boolean(errors.prixUnitaire)}
                helperText={errors.prixUnitaire}
                required
                fullWidth
              />
            </Grid>

            {/* Ref Facture / BL */}
            <Grid item xs={12}>
              <TextField
                label="N° Bon de livraison / Référence facture"
                placeholder="ex. BL-2026-0045"
                value={referenceFacture}
                onChange={(e) => setReferenceFacture(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Remarques */}
            <Grid item xs={12}>
              <TextField
                label="Remarques / Observations"
                placeholder="Remarques facultatives..."
                value={remarques}
                onChange={(e) => setRemarques(e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Grid>

            {/* Live total calculate preview */}
            <Grid item xs={12}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Montant total de l'approvisionnement
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  {previewTotal} MAD
                </Typography>
              </Stack>
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
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} /> : null}
          >
            {isEdit ? 'Enregistrer les modifications' : 'Créer l’entrée'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
