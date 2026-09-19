import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import StoreIcon from '@mui/icons-material/Store';
import { useState, useEffect, useMemo } from 'react';
import { BonCarburant, CreateBonCarburantPayload, SourceCarburant } from '../../features/carburant/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { useStockGasoilStats } from '../../features/stock-gasoil/useStockGasoil';

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

  const [sourceCarburant, setSourceCarburant] = useState<SourceCarburant>('STOCK_ENTREPRISE');
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

  // Lookups & Stock Gasoil Stats
  const { data: vehData } = useVehiclesQuery({ page: 1, limit: 100 });
  const { data: drvData } = useConducteursQuery({ page: 1, limit: 100 });
  const { data: stockStats } = useStockGasoilStats();

  const availableStock = useMemo(() => {
    return parseFloat(stockStats?.stockActuelLitres || '0');
  }, [stockStats]);

  const pmpActuel = useMemo(() => {
    return stockStats?.pmpActuel ? parseFloat(stockStats.pmpActuel) : null;
  }, [stockStats]);

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
      setSourceCarburant(bon.sourceCarburant || 'EXTERNE');
      setNumeroBon(bon.numeroBon || '');
      setImmatriculation(bon.immatriculation);
      setNomConducteur(bon.driverName || bon.nomConducteur || '');
      setNomStation(bon.nomStation || '');
      setKilometrage(bon.kilometrage !== null && bon.kilometrage !== undefined ? bon.kilometrage.toString() : '');
      setLitres(bon.litres.toString());
      setPrixParLitre(bon.prixParLitre.toString());
      setDateCarburant(bon.dateCarburant);
    } else if (open) {
      setSourceCarburant('STOCK_ENTREPRISE');
      setNumeroBon('');
      setImmatriculation('');
      setNomConducteur('');
      setNomStation('');
      setKilometrage('');
      setLitres('');
      setPrixParLitre(pmpActuel !== null ? pmpActuel.toString() : '');
      setDateCarburant(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  }, [bon, open, pmpActuel]);

  // Update prixParLitre automatically if sourceCarburant is STOCK_ENTREPRISE
  useEffect(() => {
    if (sourceCarburant === 'STOCK_ENTREPRISE' && pmpActuel !== null && !isEdit) {
      setPrixParLitre(pmpActuel.toString());
    }
  }, [sourceCarburant, pmpActuel, isEdit]);

  // Check insufficient stock
  const isInsufficientStock = useMemo(() => {
    if (sourceCarburant !== 'STOCK_ENTREPRISE') return false;
    const requested = parseFloat(litres);
    if (isNaN(requested) || requested <= 0) return false;
    return requested > availableStock;
  }, [sourceCarburant, litres, availableStock]);

  // Calculated preview
  const previewTotal = useMemo(() => {
    const l = parseFloat(litres);
    const p = parseFloat(prixParLitre);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      return (l * p).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '0,00';
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
    } else if (sourceCarburant === 'STOCK_ENTREPRISE' && numLitres > availableStock) {
      newErrors.litres = `Stock gasoil insuffisant. Disponible : ${availableStock} L, Demandé : ${numLitres} L`;
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
      sourceCarburant,
      nomConducteur: nomConducteur.trim() || undefined,
      nomStation: sourceCarburant === 'STOCK_ENTREPRISE' ? 'Citerne Entreprise (PMP)' : nomStation.trim() || undefined,
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
            {/* Source du Carburant Selector */}
            <Grid item xs={12}>
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1, fontSize: '0.875rem' }}>
                  Source du carburant *
                </FormLabel>
                <RadioGroup
                  row
                  value={sourceCarburant}
                  onChange={(e) => setSourceCarburant(e.target.value as SourceCarburant)}
                >
                  <FormControlLabel
                    value="STOCK_ENTREPRISE"
                    control={<Radio size="small" />}
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <LocalGasStationIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={600}>
                          Stock de l'entreprise (Citerne)
                        </Typography>
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    value="EXTERNE"
                    control={<Radio size="small" />}
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <StoreIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          Station-service / Fournisseur externe
                        </Typography>
                      </Stack>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Display stock stats when STOCK_ENTREPRISE */}
            {sourceCarburant === 'STOCK_ENTREPRISE' && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'primary.50',
                    borderColor: 'primary.200',
                    borderRadius: 2,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Stock disponible
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color={availableStock <= 0 ? 'error.main' : 'primary.main'}>
                        {availableStock.toLocaleString('fr-FR')} L
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        PMP actuel (Tarif appliqué)
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="secondary.main">
                        {pmpActuel !== null ? `${pmpActuel.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MAD/L` : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Insufficient Stock Warning Alert */}
            {isInsufficientStock && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                  <strong>Stock gasoil insuffisant.</strong>
                  <br />
                  Stock disponible : {availableStock.toLocaleString('fr-FR')} L | Quantité demandée : {litres} L
                </Alert>
              </Grid>
            )}

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
                    label="Conducteur"
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

            {/* Station service / Fournisseur (only editable for EXTERNE) */}
            <Grid item xs={12} sm={6}>
              {sourceCarburant === 'EXTERNE' ? (
                <TextField
                  label="Station-service / Fournisseur"
                  placeholder="ex. Afriquia Oasis"
                  value={nomStation}
                  onChange={(e) => setNomStation(e.target.value)}
                  fullWidth
                />
              ) : (
                <TextField
                  label="Station-service / Fournisseur"
                  value="Citerne Entreprise (PMP)"
                  disabled
                  fullWidth
                />
              )}
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
                label={sourceCarburant === 'STOCK_ENTREPRISE' ? 'Prix PMP / Litre (MAD)' : 'Prix / Litre (MAD) *'}
                value={prixParLitre}
                onChange={(e) => {
                  setPrixParLitre(e.target.value);
                  if (errors.prixParLitre) setErrors((prev) => ({ ...prev, prixParLitre: '' }));
                }}
                inputProps={{ step: '0.001', min: '0' }}
                error={Boolean(errors.prixParLitre)}
                helperText={errors.prixParLitre || (sourceCarburant === 'STOCK_ENTREPRISE' ? 'Fixé automatiquement par le PMP' : '')}
                disabled={sourceCarburant === 'STOCK_ENTREPRISE'}
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
            disabled={isLoading || isInsufficientStock}
            startIcon={isLoading ? <CircularProgress size={18} /> : null}
          >
            {isEdit ? 'Enregistrer les modifications' : 'Créer le bon'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
