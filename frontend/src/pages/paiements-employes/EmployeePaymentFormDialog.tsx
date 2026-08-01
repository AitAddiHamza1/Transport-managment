import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState, useEffect } from 'react';
import { useEmployesQuery } from '../../features/employes/useEmployes';
import {
  useCreatePaiementEmploye,
  useUpdatePaiementEmploye,
} from '../../features/paiements-employes/usePaiementsEmployes';
import type { PaiementEmployeView, PaiementModeEmploye } from '../../features/paiements-employes/types';
import { notify } from '../../utils/notify';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';

interface EmployeePaymentFormDialogProps {
  open: boolean;
  paiementToEdit?: PaiementEmployeView | null;
  onClose: () => void;
}

const MODES_PAIEMENT: { value: PaiementModeEmploye; label: string }[] = [
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
];

export function EmployeePaymentFormDialog({
  open,
  paiementToEdit,
  onClose,
}: EmployeePaymentFormDialogProps) {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  const isEditMode = Boolean(paiementToEdit);

  // Fetch active employees
  const { data: employesData, isLoading: isLoadingEmployes } = useEmployesQuery({
    limit: 100,
  });
  const employes = employesData?.data || [];

  const createMutation = useCreatePaiementEmploye();
  const updateMutation = useUpdatePaiementEmploye();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Form State
  const [selectedEmployeId, setSelectedEmployeId] = useState<string>('');
  const [periode, setPeriode] = useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });
  const [salaireRef, setSalaireRef] = useState<string>('');
  const [montantDu, setMontantDu] = useState<string>('');
  const [motifAjustement, setMotifAjustement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Optional Initial Versement State (Creation mode only)
  const [hasInitialVersement, setHasInitialVersement] = useState<boolean>(false);
  const [initialMontant, setInitialMontant] = useState<string>('');
  const [initialDate, setInitialDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [initialMode, setInitialMode] = useState<PaiementModeEmploye>('VIREMENT');
  const [initialRef, setInitialRef] = useState<string>('');
  const [initialNotes, setInitialNotes] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  // Sync edit values
  useEffect(() => {
    if (paiementToEdit) {
      setSelectedEmployeId(String(paiementToEdit.idEmploye));
      setPeriode(paiementToEdit.periode);
      setSalaireRef(String(paiementToEdit.salaireReference));
      setMontantDu(String(paiementToEdit.montantDu));
      setMotifAjustement(paiementToEdit.motifAjustement || '');
      setNotes(paiementToEdit.notes || '');
      setHasInitialVersement(false);
      setFormError(null);
    } else {
      handleReset();
    }
  }, [paiementToEdit, open]);

  // Auto-prefill salary reference & mode on employee selection (Creation mode only)
  useEffect(() => {
    if (isEditMode || !selectedEmployeId) return;
    const emp = employes.find((e) => e.id === Number(selectedEmployeId));
    if (emp) {
      const baseSalary = emp.salaireBase !== null && emp.salaireBase !== undefined ? String(emp.salaireBase) : '';
      setSalaireRef(baseSalary);
      setMontantDu(baseSalary);
      if (emp.modePaiement) {
        setInitialMode(emp.modePaiement as PaiementModeEmploye);
      }
    }
  }, [selectedEmployeId, employes, isEditMode]);

  const selectedEmploye = employes.find((e) => e.id === Number(selectedEmployeId));
  const baseSalaryNum = selectedEmploye?.salaireBase ?? null;
  const salaireRefNum = parseFloat(salaireRef) || 0;
  const isAdjustmentRequired =
    baseSalaryNum === null || (salaireRefNum > 0 && salaireRefNum !== baseSalaryNum);

  const handleReset = () => {
    setSelectedEmployeId('');
    setPeriode(() => {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${m}`;
    });
    setSalaireRef('');
    setMontantDu('');
    setMotifAjustement('');
    setNotes('');
    setHasInitialVersement(false);
    setInitialMontant('');
    setInitialDate(new Date().toISOString().split('T')[0]);
    setInitialMode('VIREMENT');
    setInitialRef('');
    setInitialNotes('');
    setFormError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedEmployeId) {
      setFormError('Veuillez sélectionner un employé');
      return;
    }

    if (!periode || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) {
      setFormError('La période doit être au format AAAA-MM (ex: 2026-07)');
      return;
    }

    const refNum = parseFloat(salaireRef);
    if (isNaN(refNum) || refNum <= 0) {
      setFormError('Le salaire de référence doit être un montant positif supérieur à 0');
      return;
    }

    const duNum = parseFloat(montantDu);
    if (isNaN(duNum) || duNum <= 0) {
      setFormError('Le montant dû doit être un montant positif supérieur à 0');
      return;
    }

    if (isAdjustmentRequired && (!motifAjustement || !motifAjustement.trim())) {
      setFormError(
        'Un motif d’ajustement est obligatoire lorsque le salaire de référence diffère du salaire de base de l’employé',
      );
      return;
    }

    if (isEditMode && paiementToEdit) {
      try {
        await updateMutation.mutateAsync({
          id: paiementToEdit.id,
          data: {
            periode,
            salaireReference: refNum,
            montantDu: duNum,
            motifAjustement: motifAjustement.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        });
        notify.success('Engagement de paiement mis à jour avec succès');
        handleClose();
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          'Une erreur s’est produite lors de la mise à jour de l’engagement.';
        setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      return;
    }

    // Creation mode
    let initialVersementPayload = undefined;
    if (hasInitialVersement) {
      const vMontant = parseFloat(initialMontant);
      if (isNaN(vMontant) || vMontant <= 0) {
        setFormError('Le montant du versement initial doit être supérieur à 0');
        return;
      }
      if (vMontant > duNum) {
        setFormError(`Le versement initial (${vMontant} ${currency}) dépasse le montant dû (${duNum} ${currency})`);
        return;
      }
      if (!initialDate) {
        setFormError('La date de versement est obligatoire');
        return;
      }
      initialVersementPayload = {
        montant: vMontant,
        dateVersement: initialDate,
        modePaiement: initialMode,
        referenceExterne: initialRef.trim() || undefined,
        notes: initialNotes.trim() || undefined,
      };
    }

    try {
      await createMutation.mutateAsync({
        idEmploye: Number(selectedEmployeId),
        periode,
        salaireReference: refNum,
        montantDu: duNum,
        motifAjustement: motifAjustement.trim() || undefined,
        notes: notes.trim() || undefined,
        initialVersement: initialVersementPayload,
      });

      notify.success('Engagement de paiement créé avec succès');
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de la création de l’obligation de paiement.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode
          ? `Modifier l’engagement ${paiementToEdit?.numeroPaiement} (Brouillon)`
          : 'Nouvel engagement de paiement salarié'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Employé */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Employé *"
                value={selectedEmployeId}
                onChange={(e) => setSelectedEmployeId(e.target.value)}
                fullWidth
                disabled={isLoadingEmployes || isEditMode}
                helperText={isLoadingEmployes ? 'Chargement...' : isEditMode ? 'Non modifiable après création' : ''}
              >
                {employes.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.nom} {e.prenom} ({e.matricule}) — {e.poste}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Période AAAA-MM */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Période (AAAA-MM) *"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                placeholder="2026-07"
                fullWidth
                helperText="Format mensuel AAAA-MM"
              />
            </Grid>

            {/* Salaire de référence */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label={`Salaire de référence (${currency}) *`}
                value={salaireRef}
                onChange={(e) => setSalaireRef(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
                helperText={
                  baseSalaryNum !== null
                    ? `Salaire de base actuel: ${baseSalaryNum.toLocaleString('fr-FR')} ${currency}`
                    : 'Aucun salaire de base défini sur la fiche de l’employé'
                }
              />
            </Grid>

            {/* Montant dû */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label={`Montant dû pour la période (${currency}) *`}
                value={montantDu}
                onChange={(e) => setMontantDu(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
                helperText="Montant total de l’obligation financière"
              />
            </Grid>

            {/* Motif d'ajustement (obligatoire si salaireRef != baseSalary) */}
            {isAdjustmentRequired && (
              <Grid item xs={12}>
                <TextField
                  label="Motif d’ajustement *"
                  value={motifAjustement}
                  onChange={(e) => setMotifAjustement(e.target.value)}
                  fullWidth
                  placeholder="Ex: Embauche en cours de mois, prime exceptionnelle, ajustement conventionnel..."
                  helperText="Obligatoire car le salaire de référence diffère du salaire de base récurrent"
                  error={isAdjustmentRequired && !motifAjustement.trim()}
                />
              </Grid>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                label="Notes / Remarques"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Remarques éventuelles sur cet engagement..."
              />
            </Grid>
          </Grid>

          {!isEditMode && <Divider sx={{ my: 3 }} />}

          {/* Optional Initial Versement Accordion (Creation mode only) */}
          {!isEditMode && (
            <Accordion
              expanded={hasInitialVersement}
              onChange={(_, expanded) => setHasInitialVersement(expanded)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight={600} color="primary">
                  Enregistrer un versement initial immédiat (Optionnel)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="number"
                      label={`Montant versé (${currency}) *`}
                      value={initialMontant}
                      onChange={(e) => setInitialMontant(e.target.value)}
                      fullWidth
                      inputProps={{ min: 0, step: '0.01' }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="date"
                      label="Date de versement *"
                      value={initialDate}
                      onChange={(e) => setInitialDate(e.target.value)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      label="Mode de paiement *"
                      value={initialMode}
                      onChange={(e) => setInitialMode(e.target.value as PaiementModeEmploye)}
                      fullWidth
                    >
                      {MODES_PAIEMENT.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Référence externe (N° Chèque / Virement)"
                      value={initialRef}
                      onChange={(e) => setInitialRef(e.target.value)}
                      fullWidth
                      placeholder="Ex: VIR-2026-0099"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Notes du versement"
                      value={initialNotes}
                      onChange={(e) => setInitialNotes(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} /> : null}
          >
            {isEditMode ? 'Enregistrer les modifications' : 'Créer l’engagement'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
