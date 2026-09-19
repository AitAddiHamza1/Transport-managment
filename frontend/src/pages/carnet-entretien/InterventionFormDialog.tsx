import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useEffect, useMemo, useState } from 'react';

import {
  CreateMaintenanceInterventionPayload,
  MaintenanceIntervention,
  MaintenanceRule,
} from '../../features/carnet-entretien/types';
import { useCarnetRules } from '../../features/carnet-entretien/useCarnetEntretien';
import { vehiclesApi } from '../../features/vehicles/vehiclesApi';
import { Vehicule } from '../../features/vehicles/types';
import { chargesVehiculesApi } from '../../features/charges-vehicules/chargesVehiculesApi';
import { ChargeVehicule } from '../../features/charges-vehicules/types';

interface InterventionFormDialogProps {
  open: boolean;
  intervention?: MaintenanceIntervention | null;
  onClose: () => void;
  onSubmit: (values: CreateMaintenanceInterventionPayload) => Promise<void>;
  isLoading?: boolean;
}

export function InterventionFormDialog({
  open,
  intervention,
  onClose,
  onSubmit,
  isLoading,
}: InterventionFormDialogProps) {
  const isEdit = Boolean(intervention);

  // External data
  const { data: rules = [] } = useCarnetRules();
  const [vehicles, setVehicles] = useState<Vehicule[]>([]);
  const [availableExpenses, setAvailableExpenses] = useState<ChargeVehicule[]>([]);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicule | null>(null);
  const [immatriculation, setImmatriculation] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<number | ''>('');
  const [libelle, setLibelle] = useState<string>('');
  const [dateIntervention, setDateIntervention] = useState<string>(
    new Date().toISOString().substring(0, 10),
  );
  const [kilometrageRealise, setKilometrageRealise] = useState<string>('');
  const [prochainKmEcheance, setProchainKmEcheance] = useState<string>('');
  const [prochaineDateEcheance, setProchaineDateEcheance] = useState<string>('');
  const [idDepenseVehicule, setIdDepenseVehicule] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  // Load vehicles list on mount / open
  useEffect(() => {
    if (open) {
      vehiclesApi
        .getAll({ limit: 100 })
        .then((res) => {
          setVehicles(res.data || []);
        })
        .catch(() => {});

      chargesVehiculesApi
        .getAll({ limit: 100 })
        .then((res) => {
          setAvailableExpenses(res.data || []);
        })
        .catch(() => {});
    }
  }, [open]);

  // Populate form on edit or open
  useEffect(() => {
    if (intervention) {
      setImmatriculation(intervention.immatriculation);
      setSelectedRuleId(intervention.idRule ?? '');
      setLibelle(intervention.libelle || '');
      setDateIntervention(intervention.dateIntervention || new Date().toISOString().substring(0, 10));
      setKilometrageRealise(String(intervention.kilometrageRealise ?? ''));
      setProchainKmEcheance(
        intervention.prochainKmEcheance !== null && intervention.prochainKmEcheance !== undefined
          ? String(intervention.prochainKmEcheance)
          : '',
      );
      setProchaineDateEcheance(intervention.prochaineDateEcheance || '');
      setIdDepenseVehicule(intervention.idDepenseVehicule ?? '');
      setNotes(intervention.notes || '');
    } else {
      setImmatriculation('');
      setSelectedVehicle(null);
      setSelectedRuleId('');
      setLibelle('');
      setDateIntervention(new Date().toISOString().substring(0, 10));
      setKilometrageRealise('');
      setProchainKmEcheance('');
      setProchaineDateEcheance('');
      setIdDepenseVehicule('');
      setNotes('');
    }
  }, [intervention, open]);

  // Sync selectedVehicle object when immatriculation changes
  useEffect(() => {
    if (immatriculation && vehicles.length > 0) {
      const found = vehicles.find(
        (v) => v.immatriculation.toLowerCase() === immatriculation.toLowerCase(),
      );
      if (found) {
        setSelectedVehicle(found);
      }
    }
  }, [immatriculation, vehicles]);

  // Selected Rule object
  const selectedRule = useMemo(() => {
    if (!selectedRuleId) return null;
    return rules.find((r) => r.id === Number(selectedRuleId)) || null;
  }, [selectedRuleId, rules]);

  // Auto-fill Libellé when Rule is changed (if libelle was empty or matched another rule name)
  const handleRuleChange = (ruleIdVal: number | '') => {
    setSelectedRuleId(ruleIdVal);
    if (ruleIdVal) {
      const r = rules.find((item) => item.id === ruleIdVal);
      if (r && !libelle) {
        setLibelle(r.nom);
      }
    }
  };

  // Preview Calculation
  const previewData = useMemo(() => {
    const kmRealizedNum = Number(kilometrageRealise);
    if (isNaN(kmRealizedNum) || kmRealizedNum <= 0) return null;

    let calcNextKm: number | null = null;
    let calcNextDate: string | null = null;

    if (selectedRule) {
      if (selectedRule.intervalleKm) {
        calcNextKm = kmRealizedNum + selectedRule.intervalleKm;
      }
      if (selectedRule.intervalleMois && dateIntervention) {
        const d = new Date(dateIntervention);
        d.setMonth(d.getMonth() + selectedRule.intervalleMois);
        calcNextDate = d.toISOString().substring(0, 10);
      }
    }

    return {
      kmRealized: kmRealizedNum,
      ruleName: selectedRule ? selectedRule.nom : null,
      intervalleKm: selectedRule?.intervalleKm || null,
      intervalleMois: selectedRule?.intervalleMois || null,
      calcNextKm,
      calcNextDate,
    };
  }, [kilometrageRealise, selectedRule, dateIntervention]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!immatriculation.trim() || !libelle.trim() || !dateIntervention || !kilometrageRealise) {
      return;
    }

    const payload: CreateMaintenanceInterventionPayload = {
      immatriculation: immatriculation.trim().toUpperCase(),
      idRule: selectedRuleId ? Number(selectedRuleId) : undefined,
      libelle: libelle.trim(),
      dateIntervention,
      kilometrageRealise: Number(kilometrageRealise),
      prochainKmEcheance: prochainKmEcheance !== '' ? Number(prochainKmEcheance) : undefined,
      prochaineDateEcheance: prochaineDateEcheance !== '' ? prochaineDateEcheance : undefined,
      idDepenseVehicule: idDepenseVehicule ? Number(idDepenseVehicule) : undefined,
      notes: notes.trim() || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? `Modifier l'intervention #${intervention?.id}` : 'Nouvelle intervention d’entretien'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Véhicule * */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={vehicles}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : `${option.immatriculation} (${option.marque || ''} ${option.modele || ''})`
                }
                value={selectedVehicle}
                onChange={(_, newValue) => {
                  if (newValue && typeof newValue !== 'string') {
                    setSelectedVehicle(newValue);
                    setImmatriculation(newValue.immatriculation);
                  } else {
                    setSelectedVehicle(null);
                    setImmatriculation('');
                  }
                }}
                freeSolo
                onInputChange={(_, newInputValue) => {
                  setImmatriculation(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Véhicule *"
                    placeholder="Ex: TST-58448"
                    required
                    size="small"
                    helperText="Sélectionnez un véhicule de la flotte"
                  />
                )}
              />
            </Grid>

            {/* Type / Règle d'entretien */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Règle d'entretien (Optionnel)"
                value={selectedRuleId}
                onChange={(e) => handleRuleChange(e.target.value === '' ? '' : Number(e.target.value))}
                helperText="Applique les intervalles km/date configurés"
              >
                <MenuItem value="">Aucune règle prédéfinie</MenuItem>
                {rules.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.nom} ({r.code})
                    {r.intervalleKm ? ` — ${r.intervalleKm.toLocaleString('fr-FR')} km` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Libellé * */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Libellé de l'intervention *"
                placeholder="Ex: Vidange moteur & remplacement des filtres"
                required
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
              />
            </Grid>

            {/* Date d'intervention * */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date d'intervention *"
                required
                InputLabelProps={{ shrink: true }}
                value={dateIntervention}
                onChange={(e) => setDateIntervention(e.target.value)}
              />
            </Grid>

            {/* Kilométrage réalisé * */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Kilométrage réalisé *"
                placeholder="Ex: 50000"
                required
                value={kilometrageRealise}
                onChange={(e) => setKilometrageRealise(e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* Automatic Preview Card */}
            {previewData && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    borderColor: 'primary.light',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <CalculateIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                      Aperçu automatique des échéances
                    </Typography>
                  </Stack>

                  <Grid container spacing={2}>
                    {previewData.ruleName && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Règle sélectionnée :
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {previewData.ruleName}
                          {previewData.intervalleKm ? ` (Tous les ${previewData.intervalleKm.toLocaleString('fr-FR')} km)` : ''}
                          {previewData.intervalleMois ? ` (${previewData.intervalleMois} mois)` : ''}
                        </Typography>
                      </Grid>
                    )}

                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Km réalisé :
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {previewData.kmRealized.toLocaleString('fr-FR')} km
                      </Typography>
                    </Grid>

                    {previewData.calcNextKm && (
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Prochaine échéance calculée :
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {previewData.calcNextKm.toLocaleString('fr-FR')} km
                        </Typography>
                      </Grid>
                    )}

                    {previewData.calcNextDate && (
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Prochaine date calculée :
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {previewData.calcNextDate}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Overrides */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Surcharge Prochaine Échéance (Km)"
                placeholder="Ex: 60000"
                value={prochainKmEcheance}
                onChange={(e) => setProchainKmEcheance(e.target.value)}
                helperText="Laisser vide pour calculer automatiquement via la règle"
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Surcharge Prochaine Date d'échéance"
                InputLabelProps={{ shrink: true }}
                value={prochaineDateEcheance}
                onChange={(e) => setProchaineDateEcheance(e.target.value)}
                helperText="Laisser vide pour calculer automatiquement"
              />
            </Grid>

            {/* Link with Vehicle Expense */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                size="small"
                label="Associer à une charge véhicule (Optionnel)"
                value={idDepenseVehicule}
                onChange={(e) => setIdDepenseVehicule(e.target.value === '' ? '' : Number(e.target.value))}
                helperText="Associe cette intervention à une dépense véhicule existante"
              >
                <MenuItem value="">Aucune charge liée</MenuItem>
                {availableExpenses.map((exp) => (
                  <MenuItem key={exp.idDepense} value={exp.idDepense}>
                    Dépense #{exp.idDepense} — {exp.immatriculation || 'Véhicule'} — {exp.description || exp.categorieDepense} ({exp.montant ? `${Number(exp.montant).toLocaleString('fr-FR')} MAD` : ''})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Notes / Remarques complémentaires"
                placeholder="Ex: Remplacement du filtre à huile, huile 5W30 synthétique..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button variant="contained" type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
