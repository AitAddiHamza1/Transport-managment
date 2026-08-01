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
import { Conducteur } from '../../features/conducteurs/types';

const driverSchema = z.object({
  nomConducteur: z
    .string()
    .min(1, 'Le nom du conducteur est requis')
    .max(150, 'Maximum 150 caractères'),
  telephone: z.string().max(30, 'Maximum 30 caractères').optional().nullable(),
  adresse: z.string().max(255, 'Maximum 255 caractères').optional().nullable(),
  statut: z.enum(['DISPONIBLE', 'EN_VOYAGE', 'INDISPONIBLE', 'INACTIF']).optional(),
});

type DriverFormValues = z.infer<typeof driverSchema>;

interface ConducteurFormDialogProps {
  open: boolean;
  driver: Conducteur | null;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

export function ConducteurFormDialog({
  open,
  driver,
  onClose,
  onSubmit,
  isLoading,
}: ConducteurFormDialogProps) {
  const isEditing = Boolean(driver);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      nomConducteur: '',
      telephone: '',
      adresse: '',
      statut: 'DISPONIBLE',
    },
  });

  useEffect(() => {
    if (driver) {
      reset({
        nomConducteur: driver.nomConducteur,
        telephone: driver.telephone || '',
        adresse: driver.adresse || '',
        statut: driver.statut,
      });
    } else {
      reset({
        nomConducteur: '',
        telephone: '',
        adresse: '',
        statut: 'DISPONIBLE',
      });
    }
  }, [driver, reset, open]);

  const handleFormSubmit = async (data: DriverFormValues) => {
    const payload = {
      nomConducteur: data.nomConducteur.trim(),
      telephone: data.telephone?.trim() || null,
      adresse: data.adresse?.trim() || null,
      statut: data.statut || 'DISPONIBLE',
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier le conducteur ${driver?.nomConducteur}` : 'Nouveau conducteur'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="nomConducteur"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nom complet du conducteur *"
                    placeholder="Mohamed Alami"
                    fullWidth
                    error={Boolean(errors.nomConducteur)}
                    helperText={errors.nomConducteur?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="telephone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Téléphone"
                    placeholder="+212600112233"
                    fullWidth
                    error={Boolean(errors.telephone)}
                    helperText={errors.telephone?.message}
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
                    <MenuItem value="INDISPONIBLE">Indisponible</MenuItem>
                    <MenuItem value="INACTIF">Inactif</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="adresse"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Adresse"
                    placeholder="12, Rue Hassan II, Casablanca"
                    fullWidth
                    multiline
                    rows={2}
                    error={Boolean(errors.adresse)}
                    helperText={errors.adresse?.message}
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
