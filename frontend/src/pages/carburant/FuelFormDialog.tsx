import {
  Autocomplete,
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
import { BonCarburant, CreateBonCarburantPayload } from '../../features/carburant/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';

interface FuelFormDialogProps {
  open: boolean;
  bon: BonCarburant | null;
  onClose: () => void;
  onSubmit: (values: CreateBonCarburantPayload) => Promise<void>;
  isLoading: boolean;
}

export function FuelFormDialog({
  open,
  bon,
  onClose,
  onSubmit,
  isLoading,
}: FuelFormDialogProps) {
  const isEdit = Boolean(bon);

  const [numeroBon, setNumeroBon] = useState('');
  const [immatriculation, setImmatriculation] = useState('');
  const [nomConducteur, setNomConducteur] = useState('');
  const [nomStation, setNomStation] = useState('');
  const [kilometrage, setKilometrage] = useState<string>('');
  const [litres, setLitres] = useState<string>('');
  const [prixParLitre, setPrixParLitre] = useState<string>('');
  const [dateCarburant, setDateCarburant] = useState(
    new Date().toISOString().split('T')[0],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Lookups
  const { data: vehData } = useVehiclesQuery({ page: 1, limit: 100 });
  const { data: drvData } = useConducteursQuery({ page: 1, limit: 100 });

  const vehicleOptions = useMemo(
    () => (vehData?.data || []).map((v) => v.immatriculation),
    [vehData],
  );

  const driverOptions = useMemo(
    () => (drvData?.data || []).map((d) => d.nomConducteur),
    [drvData],
  );

  useEffect(() => {
    if (bon && open) {
      setNumeroBon(bon.numeroBon || '');
      setImmatriculation(bon.immatriculation);
      setNomConducteur(bon.driverName || bon.nomConducteur || '');
      setNomStation(bon.nomStation || '');
      setKilometrage(bon.kilometrage !== null && bon.kilometrage !== undefined ? bon.kilometrage.toString() : '');
      setLitres(bon.litres.toString());
      setPrixParLitre(bon.prixParLitre.toString());
      setDateCarburant(bon.dateCarburant);
    } else if (open) {
      setNumeroBon('');
      setImmatriculation('');
      setNomConducteur('');
      setNomStation('');
      setKilometrage('');
      setLitres('');
      setPrixParLitre('');
      setDateCarburant(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  }, [bon, open]);

  // Calculated preview
  const previewTotal = useMemo(() => {
    const l = parseFloat(litres);
    const p = parseFloat(prixParLitre);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      return (l * p).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '0.00';
  }, [litres, prixParLitre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!numeroBon.trim()) {
      newErrors.numeroBon = 'Le numéro du bon de carburant est obligatoire';
    }

    if (!immatriculation.trim()) {
      newErrors.immatriculation = 'L’immatriculation du véhicule est obligatoire';
    }

    const numLitres = parseFloat(litres);
    if (isNaN(numLitres) || numLitres <= 0) {
      newErrors.litres = 'La quantité doit être un nombre positif supérieur à 0';
    }

    const numPrix = parseFloat(prixParLitre);
    if (isNaN(numPrix) || numPrix <= 0) {
      newErrors.prixParLitre = 'Le prix par litre doit être un nombre positif supérieur à 0';
    }

    let numKm: number | undefined = undefined;
    if (kilometrage.trim()) {
      const parsedKm = parseInt(kilometrage.trim(), 10);
      if (isNaN(parsedKm) || parsedKm < 0) {
        newErrors.kilometrage = 'Le kilométrage doit être un nombre entier positif ou nul';
      } else {
        numKm = parsedKm;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      numeroBon: numeroBon.trim().toUpperCase(),
      immatriculation: immatriculation.trim().toUpperCase(),
      nomConducteur: nomConducteur.trim() || undefined,
      nomStation: nomStation.trim() || undefined,
      kilometrage: numKm,
      litres: numLitres,
      prixParLitre: numPrix,
      dateCarburant: dateCarburant || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {isEdit ? `Modifier le bon de carburant #${bon?.idBon}` : 'Nouveau bon de carburant'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Saisie de la consommation de gasoil, kilométrage et prix au litre
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* N° Bon */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="N° Bon de carburant *"
                placeholder="ex. BG-2026-001"
                value={numeroBon}
                onChange={(e) => {
                  setNumeroBon(e.target.value);
                  if (errors.numeroBon) setErrors((prev) => ({ ...prev, numeroBon: '' }));
                }}
                error={Boolean(errors.numeroBon)}
                helperText={errors.numeroBon}
                required
                fullWidth
              />
            </Grid>

            {/* Date du plein */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date du plein *"
                value={dateCarburant}
                onChange={(e) => setDateCarburant(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
            </Grid>

            {/* Véhicule immatriculé */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={vehicleOptions}
                value={immatriculation}
                onChange={(_, newValue) => {
                  setImmatriculation(newValue || '');
                  if (errors.immatriculation) setErrors((prev) => ({ ...prev, immatriculation: '' }));
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Véhicule (Immatriculation) *"
                    error={Boolean(errors.immatriculation)}
                    helperText={errors.immatriculation}
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Conducteur */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={driverOptions}
                value={nomConducteur}
                onChange={(_, newValue) => setNomConducteur(newValue || '')}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Conducteur (Snapshot)"
                    placeholder="Nom du chauffeur"
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Relevé kilométrique */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Kilométrage du véhicule (km)"
                placeholder="ex. 151200"
                value={kilometrage}
                onChange={(e) => {
                  setKilometrage(e.target.value);
                  if (errors.kilometrage) setErrors((prev) => ({ ...prev, kilometrage: '' }));
                }}
                inputProps={{ step: '1', min: '0' }}
                error={Boolean(errors.kilometrage)}
                helperText={errors.kilometrage}
                fullWidth
              />
            </Grid>

            {/* Station service */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Station-service / Fournisseur"
                placeholder="ex. Afriquia Oasis"
                value={nomStation}
                onChange={(e) => setNomStation(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Quantité en Litres */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Quantité (Litres) *"
                value={litres}
                onChange={(e) => {
                  setLitres(e.target.value);
                  if (errors.litres) setErrors((prev) => ({ ...prev, litres: '' }));
                }}
                inputProps={{ step: '0.01', min: '0' }}
                error={Boolean(errors.litres)}
                helperText={errors.litres}
                required
                fullWidth
              />
            </Grid>

            {/* Prix par Litre */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Prix / Litre (MAD) *"
                value={prixParLitre}
                onChange={(e) => {
                  setPrixParLitre(e.target.value);
                  if (errors.prixParLitre) setErrors((prev) => ({ ...prev, prixParLitre: '' }));
                }}
                inputProps={{ step: '0.001', min: '0' }}
                error={Boolean(errors.prixParLitre)}
                helperText={errors.prixParLitre}
                required
                fullWidth
              />
            </Grid>

            {/* Live calculated total preview */}
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
                  Montant total calculé (Automatique)
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
            {isEdit ? 'Enregistrer les modifications' : 'Créer le bon'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
