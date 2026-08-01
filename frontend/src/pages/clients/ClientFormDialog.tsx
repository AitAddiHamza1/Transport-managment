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
import { Client } from '../../features/clients/types';

const clientSchema = z.object({
  nomEntreprise: z
    .string()
    .min(1, 'La raison sociale du client est requise')
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
  delaiPaiementJours: z
    .number({ invalid_type_error: 'Le délai de paiement doit être un nombre' })
    .min(0, 'Le délai ne peut pas être négatif')
    .max(365, 'Maximum 365 jours')
    .optional(),
  limiteCredit: z
    .number({ invalid_type_error: 'La limite de crédit doit être un nombre' })
    .min(0, 'La limite de crédit ne peut pas être négative')
    .optional(),
  statut: z.enum(['ACTIF', 'INACTIF', 'BLOQUE']).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormDialogProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

export function ClientFormDialog({
  open,
  client,
  onClose,
  onSubmit,
  isLoading,
}: ClientFormDialogProps) {
  const isEditing = Boolean(client);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nomEntreprise: '',
      ice: '',
      telephone: '',
      email: '',
      adresse: '',
      delaiPaiementJours: 30,
      limiteCredit: 0,
      statut: 'ACTIF',
    },
  });

  useEffect(() => {
    if (client) {
      reset({
        nomEntreprise: client.nomEntreprise,
        ice: client.ice || '',
        telephone: client.telephone || '',
        email: client.email || '',
        adresse: client.adresse || '',
        delaiPaiementJours: client.delaiPaiementJours,
        limiteCredit: client.limiteCredit,
        statut: client.statut,
      });
    } else {
      reset({
        nomEntreprise: '',
        ice: '',
        telephone: '',
        email: '',
        adresse: '',
        delaiPaiementJours: 30,
        limiteCredit: 0,
        statut: 'ACTIF',
      });
    }
  }, [client, reset, open]);

  const handleFormSubmit = async (data: ClientFormValues) => {
    const payload = {
      nomEntreprise: data.nomEntreprise.trim(),
      ice: data.ice ? data.ice.trim().toUpperCase() : null,
      telephone: data.telephone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      adresse: data.adresse?.trim() || null,
      delaiPaiementJours: data.delaiPaiementJours ?? 30,
      limiteCredit: data.limiteCredit ?? 0,
      statut: data.statut || 'ACTIF',
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier le client ${client?.nomEntreprise}` : 'Nouveau client'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <Controller
                name="nomEntreprise"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Raison sociale / Nom entreprise *"
                    placeholder="Société Maghreb Transport"
                    fullWidth
                    error={Boolean(errors.nomEntreprise)}
                    helperText={errors.nomEntreprise?.message}
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
                    placeholder="001524389000045"
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
                    placeholder="+212522001122"
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
                    placeholder="contact@entreprise.ma"
                    fullWidth
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                    disabled={isLoading}
                  />
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
                    label="Adresse complète"
                    placeholder="Boulevard Zerktouni, Casablanca"
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
                name="delaiPaiementJours"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    value={field.value ?? 30}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    label="Délai de paiement (jours)"
                    placeholder="30"
                    fullWidth
                    error={Boolean(errors.delaiPaiementJours)}
                    helperText={errors.delaiPaiementJours?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="limiteCredit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    label="Plafond de crédit (MAD)"
                    placeholder="50000"
                    fullWidth
                    error={Boolean(errors.limiteCredit)}
                    helperText={errors.limiteCredit?.message}
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
