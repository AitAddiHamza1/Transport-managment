import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Vehicule } from '../../features/vehicles/types';

const vehicleSchema = z.object({
  immatriculation: z
    .string()
    .min(1, 'L’immatriculation est requise')
    .max(20, 'Maximum 20 caractères'),
  marque: z
    .string()
    .min(1, 'La marque est requise')
    .max(60, 'Maximum 60 caractères'),
  modele: z.string().max(60, 'Maximum 60 caractères').optional().nullable(),
  typeVehicule: z.string().max(40, 'Maximum 40 caractères').optional(),
  annee: z
    .union([
      z.number().int().min(1900, 'Année invalide').max(new Date().getFullYear() + 1, 'Année invalide'),
      z.nan(),
      z.null(),
    ])
    .optional(),
  numeroChassis: z.string().max(50, 'Maximum 50 caractères').optional().nullable(),
  capaciteCharge: z
    .union([
      z.number().min(0, 'La capacité doit être positive').max(999999.99, 'Capacité maximale dépassée'),
      z.nan(),
      z.null(),
    ])
    .optional(),
  statut: z.enum(['DISPONIBLE', 'EN_VOYAGE', 'MAINTENANCE', 'HORS_SERVICE']).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  vehicle: Vehicule | null;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

const TYPE_OPTIONS = ['CAMION', 'TRACTEUR', 'REMORQUE', 'UTILITAIRE', 'CITERNE', 'PORTE_CONTENEUR'];

export function VehicleFormDialog({
  open,
  vehicle,
  onClose,
  onSubmit,
  isLoading,
}: VehicleFormDialogProps) {
  const isEditing = Boolean(vehicle);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      immatriculation: '',
      marque: '',
      modele: '',
      typeVehicule: 'CAMION',
      annee: undefined,
      numeroChassis: '',
      capaciteCharge: undefined,
      statut: 'DISPONIBLE',
    },
  });

  useEffect(() => {
    if (vehicle) {
      reset({
        immatriculation: vehicle.immatriculation,
        marque: vehicle.marque,
        modele: vehicle.modele || '',
        typeVehicule: vehicle.typeVehicule || 'CAMION',
        annee: vehicle.annee ?? undefined,
        numeroChassis: vehicle.numeroChassis || '',
        capaciteCharge: vehicle.capaciteCharge ?? undefined,
        statut: vehicle.statut,
      });
    } else {
      reset({
        immatriculation: '',
        marque: '',
        modele: '',
        typeVehicule: 'CAMION',
        annee: undefined,
        numeroChassis: '',
        capaciteCharge: undefined,
        statut: 'DISPONIBLE',
      });
    }
  }, [vehicle, reset, open]);

  const handleFormSubmit = async (data: VehicleFormValues) => {
    const payload = {
      immatriculation: data.immatriculation.trim(),
      marque: data.marque.trim(),
      modele: data.modele?.trim() || null,
      typeVehicule: data.typeVehicule?.trim().toUpperCase() || 'CAMION',
      annee: typeof data.annee === 'number' && !isNaN(data.annee) ? data.annee : null,
      numeroChassis: data.numeroChassis?.trim() || null,
      capaciteCharge:
        typeof data.capaciteCharge === 'number' && !isNaN(data.capaciteCharge)
          ? data.capaciteCharge
          : null,
      statut: data.statut || 'DISPONIBLE',
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier le véhicule ${vehicle?.immatriculation}` : 'Nouveau véhicule'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="immatriculation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Immatriculation *"
                    placeholder="12345-A-6"
                    fullWidth
                    error={Boolean(errors.immatriculation)}
                    helperText={errors.immatriculation?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="typeVehicule"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Type de véhicule"
                    fullWidth
                    error={Boolean(errors.typeVehicule)}
                    helperText={errors.typeVehicule?.message}
                    disabled={isLoading}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="marque"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Marque *"
                    placeholder="Volvo, Scania, DAF..."
                    fullWidth
                    error={Boolean(errors.marque)}
                    helperText={errors.marque?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="modele"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Modèle"
                    placeholder="FH16, R450..."
                    fullWidth
                    error={Boolean(errors.modele)}
                    helperText={errors.modele?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="numeroChassis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Numéro de châssis (VIN)"
                    placeholder="VF1..."
                    fullWidth
                    error={Boolean(errors.numeroChassis)}
                    helperText={errors.numeroChassis?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="annee"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      field.onChange(val);
                    }}
                    type="number"
                    label="Année de fabrication"
                    placeholder="2022"
                    fullWidth
                    error={Boolean(errors.annee)}
                    helperText={errors.annee?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="capaciteCharge"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      field.onChange(val);
                    }}
                    type="number"
                    inputProps={{ step: '0.01' }}
                    label="Capacité de charge (Tonnes)"
                    placeholder="25.5"
                    fullWidth
                    error={Boolean(errors.capaciteCharge)}
                    helperText={errors.capaciteCharge?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="statut"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Statut initial"
                    fullWidth
                    error={Boolean(errors.statut)}
                    helperText={errors.statut?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="DISPONIBLE">Disponible</MenuItem>
                    <MenuItem value="EN_VOYAGE">En voyage</MenuItem>
                    <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                    <MenuItem value="HORS_SERVICE">Hors service</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading} startIcon={isLoading ? <CircularProgress size={18} /> : null}>
            {isEditing ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
