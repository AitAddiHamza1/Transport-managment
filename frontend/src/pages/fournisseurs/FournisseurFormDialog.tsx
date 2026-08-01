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
import { Fournisseur } from '../../features/fournisseurs/types';

const supplierSchema = z.object({
  nomFournisseur: z
    .string()
    .min(1, 'La raison sociale du fournisseur est requise')
    .max(150, 'Maximum 150 caractères'),
  ice: z
    .string()
    .max(15, 'Maximum 15 caractères')
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim().toUpperCase() : null)),
  telephone: z.string().max(30, 'Maximum 30 caractères').optional().nullable(),
  email: z.string().email('Adresse email invalide').or(z.literal('')).optional().nullable(),
  adresse: z.string().max(255, 'Maximum 255 caractères').optional().nullable(),
  statut: z.enum(['ACTIF', 'INACTIF', 'BLOQUE']).optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface FournisseurFormDialogProps {
  open: boolean;
  supplier: Fournisseur | null;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

export function FournisseurFormDialog({
  open,
  supplier,
  onClose,
  onSubmit,
  isLoading,
}: FournisseurFormDialogProps) {
  const isEditing = Boolean(supplier);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nomFournisseur: '',
      ice: '',
      telephone: '',
      email: '',
      adresse: '',
      statut: 'ACTIF',
    },
  });

  useEffect(() => {
    if (supplier) {
      reset({
        nomFournisseur: supplier.nomFournisseur,
        ice: supplier.ice || '',
        telephone: supplier.telephone || '',
        email: supplier.email || '',
        adresse: supplier.adresse || '',
        statut: supplier.statut,
      });
    } else {
      reset({
        nomFournisseur: '',
        ice: '',
        telephone: '',
        email: '',
        adresse: '',
        statut: 'ACTIF',
      });
    }
  }, [supplier, reset, open]);

  const handleFormSubmit = async (data: SupplierFormValues) => {
    const payload = {
      nomFournisseur: data.nomFournisseur.trim(),
      ice: data.ice ? data.ice.trim().toUpperCase() : null,
      telephone: data.telephone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      adresse: data.adresse?.trim() || null,
      statut: data.statut || 'ACTIF',
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier le fournisseur ${supplier?.nomFournisseur}` : 'Nouveau fournisseur'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <Controller
                name="nomFournisseur"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Raison sociale / Nom du fournisseur *"
                    placeholder="TotalEnergies Marketing Maroc"
                    fullWidth
                    error={Boolean(errors.nomFournisseur)}
                    helperText={errors.nomFournisseur?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="ice"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="N° ICE (15 chiffres)"
                    placeholder="001654321000099"
                    fullWidth
                    error={Boolean(errors.ice)}
                    helperText={errors.ice?.message}
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
                    placeholder="+212522998877"
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
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Email"
                    placeholder="contact@fournisseur.ma"
                    fullWidth
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <Controller
                name="adresse"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="Adresse complète"
                    placeholder="Zone Industrielle, Mohammedia"
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

            <Grid item xs={12} sm={4}>
              <Controller
                name="statut"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Statut"
                    fullWidth
                    error={Boolean(errors.statut)}
                    helperText={errors.statut?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="ACTIF">Actif</MenuItem>
                    <MenuItem value="INACTIF">Inactif</MenuItem>
                    <MenuItem value="BLOQUE">Bloqué</MenuItem>
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
