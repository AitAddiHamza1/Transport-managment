import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
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

const expenseSchema = z.object({
  categorieDepense: z.string().min(1, 'La catégorie est requise').max(60, 'Maximum 60 caractères'),
  typeFacture: z.string().max(40, 'Maximum 40 caractères').optional().nullable(),
  immatriculation: z.string().min(1, 'Le véhicule est requis').max(20, 'Maximum 20 caractères'),
  description: z.string().max(255, 'Maximum 255 caractères').optional().nullable(),
  montant: z.coerce.number().min(0, 'Le montant doit être supérieur ou égal à 0'),
  dateDepense: z.string().optional(),
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
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categorieDepense: 'ENTRETIEN',
      typeFacture: '',
      immatriculation: '',
      description: '',
      montant: 0,
      dateDepense: '',
    },
  });

  useEffect(() => {
    setSelectedFile(null);
    setFileError(null);
    if (expense) {
      reset({
        categorieDepense: expense.categorieDepense,
        typeFacture: expense.typeFacture || '',
        immatriculation: expense.immatriculation,
        description: expense.description || '',
        montant: expense.montant || 0,
        dateDepense: expense.dateDepense || '',
      });
    } else {
      reset({
        categorieDepense: 'ENTRETIEN',
        typeFacture: '',
        immatriculation: '',
        description: '',
        montant: 0,
        dateDepense: new Date().toISOString().split('T')[0],
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
    const payload = {
      categorieDepense: data.categorieDepense.trim(),
      typeFacture: data.typeFacture?.trim() || null,
      immatriculation: data.immatriculation.trim(),
      description: data.description?.trim() || null,
      montant: Number(data.montant) || 0,
      dateDepense: data.dateDepense || undefined,
    };
    await onSubmit({ payload, file: selectedFile || undefined });
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier la dépense #${expense?.idDepense}` : 'Nouvelle dépense véhicule'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Véhicule */}
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

            {/* Catégorie Dépense */}
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

            {/* Montant */}
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

            {/* Date Dépense */}
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

            {/* N° Facture / Référence */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="typeFacture"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="N° Facture / Référence"
                    placeholder="FAC-2026-0045"
                    fullWidth
                    error={Boolean(errors.typeFacture)}
                    helperText={errors.typeFacture?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Facture / Reçu File Upload */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Facture / Reçu (Joindre un fichier)
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

            {/* Description */}
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
