import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { ChargeVehicule } from '../../features/charges-vehicules/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useDeleteReceipt } from '../../features/charges-vehicules/useChargesVehicules';
import { Vehicule } from '../../features/vehicles/types';

const expenseCategories = [
  'ENTRETIEN',
  'REPARATION',
  'ASSURANCE',
  'TAXE',
  'PEAGE',
  'PNEUS',
  'PIECES',
  'LAVAGE',
  'CONTROLE_TECHNIQUE',
  'AUTRE',
];

const expenseSchema = z
  .object({
    categorieDepense: z.string().min(1, 'La catégorie est requise').max(60, 'Maximum 60 caractères'),
    justificatifType: z.enum(['AVEC_FACTURE', 'SANS_FACTURE']).default('SANS_FACTURE'),
    typeFacture: z.string().max(40, 'Maximum 40 caractères').optional().nullable(),
    immatriculation: z.string().min(1, 'Le véhicule est requis').max(20, 'Maximum 20 caractères'),
    description: z.string().max(255, 'Maximum 255 caractères').optional().nullable(),
    montant: z.coerce.number().min(0, 'Le montant doit être supérieur ou égal à 0'),
    dateDepense: z.string().optional(),
    isMaintenanceIntervention: z.boolean().default(false),
    libelleIntervention: z.string().optional().nullable(),
    kilometrageRealise: z.coerce.number().optional().nullable(),
    intervalleKm: z.coerce.number().optional().nullable(),
    notesIntervention: z.string().max(500, 'Maximum 500 caractères').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.justificatifType === 'AVEC_FACTURE') {
      if (!data.typeFacture || !data.typeFacture.trim()) {
        ctx.addIssue({
          path: ['typeFacture'],
          code: z.ZodIssueCode.custom,
          message: 'Le numéro de facture/référence est requis pour une dépense avec facture',
        });
      }
    }
    if (data.isMaintenanceIntervention) {
      if (!data.libelleIntervention || !data.libelleIntervention.trim()) {
        ctx.addIssue({
          path: ['libelleIntervention'],
          code: z.ZodIssueCode.custom,
          message: "Le libellé de l'intervention est requis",
        });
      }
      if (
        data.kilometrageRealise === undefined ||
        data.kilometrageRealise === null ||
        isNaN(data.kilometrageRealise) ||
        data.kilometrageRealise < 0
      ) {
        ctx.addIssue({
          path: ['kilometrageRealise'],
          code: z.ZodIssueCode.custom,
          message: 'Le kilométrage actuel doit être supérieur ou égal à 0',
        });
      }
      if (
        data.intervalleKm === undefined ||
        data.intervalleKm === null ||
        isNaN(data.intervalleKm) ||
        data.intervalleKm <= 0
      ) {
        ctx.addIssue({
          path: ['intervalleKm'],
          code: z.ZodIssueCode.custom,
          message: "L'intervalle doit être strictement supérieur à 0",
        });
      }
    }
  });

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface VehicleExpenseFormDialogProps {
  open: boolean;
  expense: ChargeVehicule | null;
  onClose: () => void;
  onSubmit: (values: { payload: any; file?: File }) => Promise<void>;
  isLoading: boolean;
}

export function VehicleExpenseFormDialog({
  open,
  expense,
  onClose,
  onSubmit,
  isLoading,
}: VehicleExpenseFormDialogProps) {
  const isEditing = Boolean(expense);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const deleteReceiptMutation = useDeleteReceipt();

  // Fetch vehicles for dropdown
  const { data: vehiculesData } = useVehiclesQuery({ limit: 100 });
  const vehicules: Vehicule[] = vehiculesData?.data || [];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      typeFacture: '',
      immatriculation: '',
      description: '',
      montant: 0,
      dateDepense: '',
      isMaintenanceIntervention: false,
      libelleIntervention: '',
      kilometrageRealise: 0,
      intervalleKm: 100,
      notesIntervention: '',
    },
  });

  const watchedJustificatifType = watch('justificatifType');
  const watchedIsMaintenance = watch('isMaintenanceIntervention');
  const watchedKmRealise = watch('kilometrageRealise');
  const watchedIntervalleKm = watch('intervalleKm');

  const previewProchaineEcheance = (() => {
    const rawKm: any = watchedKmRealise;
    const rawIntervalle: any = watchedIntervalleKm;

    if (
      rawKm === '' ||
      rawKm === null ||
      rawKm === undefined ||
      rawIntervalle === '' ||
      rawIntervalle === null ||
      rawIntervalle === undefined
    ) {
      return '—';
    }

    const km = Number(rawKm);
    const intervalle = Number(rawIntervalle);

    if (isNaN(km) || isNaN(intervalle) || km < 0 || intervalle <= 0) {
      return '—';
    }

    const total = km + intervalle;
    return `${total.toLocaleString('fr-FR')} km`;
  })();

  useEffect(() => {
    if (watchedJustificatifType === 'SANS_FACTURE') {
      setSelectedFile(null);
      setFileError(null);
      setValue('typeFacture', '');
    }
  }, [watchedJustificatifType, setValue]);

  useEffect(() => {
    setSelectedFile(null);
    setFileError(null);
    if (expense) {
      const intervention = expense.maintenanceIntervention;
      const hasIntervention = Boolean(intervention);
      const computedIntervalle =
        intervention?.intervalleKm ||
        (intervention && intervention.prochainKmEcheance && intervention.kilometrageRealise
          ? intervention.prochainKmEcheance - intervention.kilometrageRealise
          : 100);

      reset({
        categorieDepense: expense.categorieDepense,
        justificatifType: expense.justificatifType || 'SANS_FACTURE',
        typeFacture: expense.typeFacture || '',
        immatriculation: expense.immatriculation,
        description: expense.description || '',
        montant: expense.montant || 0,
        dateDepense: expense.dateDepense || '',
        isMaintenanceIntervention: hasIntervention,
        libelleIntervention: intervention?.libelle || '',
        kilometrageRealise: intervention?.kilometrageRealise ?? 0,
        intervalleKm: computedIntervalle,
        notesIntervention: intervention?.notes || '',
      });
    } else {
      reset({
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'SANS_FACTURE',
        typeFacture: '',
        immatriculation: '',
        description: '',
        montant: 0,
        dateDepense: new Date().toISOString().split('T')[0],
        isMaintenanceIntervention: false,
        libelleIntervention: '',
        kilometrageRealise: 0,
        intervalleKm: 100,
        notesIntervention: '',
      });
    }
  }, [expense, reset, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        setFileError('Format de fichier non autorisé. Formats acceptés : PDF, JPG, PNG.');
        setSelectedFile(null);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFileError('La taille du fichier dépasse la limite maximale de 5 Mo.');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleRemoveExistingReceipt = async () => {
    if (expense?.idDepense) {
      await deleteReceiptMutation.mutateAsync(expense.idDepense);
    }
  };

  const handleFormSubmit = async (data: ExpenseFormValues) => {
    if (data.justificatifType === 'AVEC_FACTURE') {
      if (!isEditing && !selectedFile) {
        setFileError('Un fichier de justificatif/facture est requis.');
        return;
      }
    }

    const payload: any = {
      categorieDepense: data.categorieDepense.trim(),
      justificatifType: data.justificatifType,
      typeFacture: data.justificatifType === 'AVEC_FACTURE' ? data.typeFacture?.trim() || null : null,
      immatriculation: data.immatriculation.trim(),
      description: data.description?.trim() || null,
      montant: Number(data.montant) || 0,
      dateDepense: data.dateDepense || undefined,
      isMaintenanceIntervention: Boolean(data.isMaintenanceIntervention),
    };

    if (data.isMaintenanceIntervention) {
      payload.libelleIntervention = data.libelleIntervention?.trim();
      payload.kilometrageRealise = Number(data.kilometrageRealise);
      payload.intervalleKm = Number(data.intervalleKm);
      payload.notesIntervention = data.notesIntervention?.trim() || undefined;
    }

    await onSubmit({
      payload,
      file: data.justificatifType === 'AVEC_FACTURE' ? selectedFile || undefined : undefined,
    });
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier la dépense #${expense?.idDepense}` : 'Nouvelle dépense véhicule'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Row 1: Véhicule immatriculé & Catégorie de dépense */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="immatriculation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Véhicule immatriculé *"
                    fullWidth
                    error={Boolean(errors.immatriculation)}
                    helperText={errors.immatriculation?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="">— Sélectionner un véhicule —</MenuItem>
                    {vehicules.map((v) => (
                      <MenuItem key={v.id} value={v.immatriculation}>
                        {v.immatriculation} ({v.marque} {v.modele || ''})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="categorieDepense"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Catégorie de dépense *"
                    fullWidth
                    error={Boolean(errors.categorieDepense)}
                    helperText={errors.categorieDepense?.message}
                    disabled={isLoading}
                  >
                    {expenseCategories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Row 2: Justificatif de dépense & Montant (MAD) */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="justificatifType"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Justificatif de dépense *"
                    fullWidth
                    error={Boolean(errors.justificatifType)}
                    helperText={errors.justificatifType?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="AVEC_FACTURE">Avec facture</MenuItem>
                    <MenuItem value="SANS_FACTURE">Sans facture</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="montant"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Montant (MAD) *"
                    placeholder="1850"
                    fullWidth
                    error={Boolean(errors.montant)}
                    helperText={errors.montant?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Row 3: Date de la dépense & N° Facture / Référence (if AVEC_FACTURE) */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="dateDepense"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    value={field.value || ''}
                    label="Date de la dépense"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    error={Boolean(errors.dateDepense)}
                    helperText={errors.dateDepense?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {watchedJustificatifType === 'AVEC_FACTURE' && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="typeFacture"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      label="N° Facture / Référence *"
                      placeholder="FAC-2026-0045"
                      fullWidth
                      error={Boolean(errors.typeFacture)}
                      helperText={errors.typeFacture?.message}
                      disabled={isLoading}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Row 4: Facture / Reçu (Joindre un fichier) (if AVEC_FACTURE) */}
            {watchedJustificatifType === 'AVEC_FACTURE' && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Facture / Reçu (Joindre un fichier) *
                </Typography>
                <Stack spacing={1}>
                  {expense?.hasReceipt && !selectedFile && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        icon={<InsertDriveFileIcon />}
                        label="Reçu actuellement joint"
                        color="success"
                        variant="outlined"
                        size="small"
                      />
                      <IconButton
                        size="small"
                        color="info"
                        component="a"
                        href={expense.receiptUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={handleRemoveExistingReceipt}
                        disabled={deleteReceiptMutation.isPending || isLoading}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}

                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    disabled={isLoading}
                    fullWidth
                  >
                    {selectedFile ? 'Remplacer le fichier sélectionné' : 'Sélectionner un fichier (PDF, Image)'}
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                    />
                  </Button>

                  {selectedFile && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} Ko)
                      </Typography>
                      <IconButton size="small" color="error" onClick={() => setSelectedFile(null)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}

                  <FormHelperText error={Boolean(fileError)}>
                    {fileError || 'PDF, JPG ou PNG — 5 Mo maximum'}
                  </FormHelperText>
                </Stack>
              </Grid>
            )}

            {/* Row 5: Description */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Description"
                    placeholder="Vidange complète et remplacement des filtres à huile et à air"
                    fullWidth
                    multiline
                    rows={2}
                    error={Boolean(errors.description)}
                    helperText={errors.description?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Section: Informations d'entretien */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                  Informations d'entretien
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Cette charge concerne-t-elle un entretien / une intervention ?
                </Typography>

                <Controller
                  name="isMaintenanceIntervention"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      row
                      value={field.value ? 'true' : 'false'}
                      onChange={(e) => field.onChange(e.target.value === 'true')}
                    >
                      <FormControlLabel value="false" control={<Radio size="small" />} label="Non" />
                      <FormControlLabel value="true" control={<Radio size="small" />} label="Oui" />
                    </RadioGroup>
                  )}
                />

                {watchedIsMaintenance && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                      <Controller
                        name="libelleIntervention"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value || ''}
                            label="Intervention réalisée *"
                            placeholder="Ex: Changement des pneus, Vidange"
                            fullWidth
                            error={Boolean(errors.libelleIntervention)}
                            helperText={
                              errors.libelleIntervention?.message ||
                              "Décrivez l'opération effectuée sur le véhicule."
                            }
                            disabled={isLoading}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="kilometrageRealise"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            value={field.value ?? ''}
                            label="Kilométrage actuel (km) *"
                            placeholder="1500"
                            fullWidth
                            error={Boolean(errors.kilometrageRealise)}
                            helperText={errors.kilometrageRealise?.message}
                            disabled={isLoading}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="intervalleKm"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            value={field.value ?? ''}
                            label="Intervalle prochain entretien (km) *"
                            placeholder="100"
                            fullWidth
                            error={Boolean(errors.intervalleKm)}
                            helperText={errors.intervalleKm?.message}
                            disabled={isLoading}
                          />
                        )}
                      />
                    </Grid>

                    {/* Read-only preview for next mileage */}
                    <Grid item xs={12}>
                      <TextField
                        label="Prochaine échéance kilométrique"
                        value={previewProchaineEcheance}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        helperText="Calculée automatiquement (Kilométrage actuel + Intervalle)"
                        variant="filled"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name="notesIntervention"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value || ''}
                            label="Notes / remarques"
                            placeholder="Remarques complémentaires sur l'intervention"
                            fullWidth
                            multiline
                            rows={2}
                            error={Boolean(errors.notesIntervention)}
                            helperText={errors.notesIntervention?.message}
                            disabled={isLoading}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                )}
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
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} /> : null}
          >
            {isEditing ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
