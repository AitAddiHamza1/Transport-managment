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
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Conducteur } from '../../features/conducteurs/types';
import { useEmployesQuery } from '../../features/employes/useEmployes';

const driverSchema = z.object({
  idEmploye: z.coerce.number().min(1, 'Veuillez sélectionner un employé'),
  statut: z.enum(['DISPONIBLE', 'EN_VOYAGE', 'INDISPONIBLE', 'INACTIF']).optional(),
  nomConducteur: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
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

  const { data: employesData } = useEmployesQuery({ limit: 100, statut: 'ACTIF' });
  const eligibleEmployees = (employesData?.data || []).filter(
    (e: any) => !e.conducteur || (driver && driver.idEmploye === e.id)
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      idEmploye: 0,
      statut: 'DISPONIBLE',
      nomConducteur: '',
      telephone: '',
      adresse: '',
    },
  });

  useEffect(() => {
    if (driver) {
      reset({
        idEmploye: driver.idEmploye || 0,
        statut: driver.statut,
        nomConducteur: driver.nomConducteur || '',
        telephone: driver.telephone || '',
        adresse: driver.adresse || '',
      });
    } else {
      reset({
        idEmploye: eligibleEmployees[0]?.id || 0,
        statut: 'DISPONIBLE',
        nomConducteur: '',
        telephone: '',
        adresse: '',
      });
    }
  }, [driver, reset, open]);

  const handleFormSubmit = async (data: DriverFormValues) => {
    const payload = {
      idEmploye: isEditing ? driver?.idEmploye : Number(data.idEmploye),
      statut: data.statut || 'DISPONIBLE',
      nomConducteur: isEditing ? driver?.nomConducteur : undefined,
      telephone: isEditing ? driver?.telephone : undefined,
      adresse: isEditing ? driver?.adresse : undefined,
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEditing ? `Modifier le conducteur` : 'Nouveau conducteur'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* If creating: select active employee */}
            {!isEditing ? (
              <Grid item xs={12}>
                <Controller
                  name="idEmploye"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      value={field.value || ''}
                      label="Sélectionner l'employé *"
                      fullWidth
                      error={Boolean(errors.idEmploye)}
                      helperText={errors.idEmploye?.message || "Seuls les employés actifs n'ayant pas de profil conducteur sont affichés"}
                      disabled={isLoading}
                    >
                      <MenuItem value={0} disabled>
                        — Choisissez un collaborateur —
                      </MenuItem>
                      {eligibleEmployees.map((e: any) => (
                        <MenuItem key={e.id} value={e.id}>
                          {e.prenom} {e.nom} ({e.matricule} • {e.poste})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: '#f4f6f8', borderRadius: 1 }}>
                  L'identité du conducteur est liée à la fiche employé RH de <strong>{driver?.nomConducteur}</strong>. Les modifications d'identité doivent être effectuées depuis le module Employés.
                </Typography>
              </Grid>
            )}

            {/* Statut initial */}
            <Grid item xs={12}>
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
                    <MenuItem value="DISPONIBLE">Disponible</MenuItem>
                    <MenuItem value="EN_VOYAGE" disabled>En voyage (géré par les voyages)</MenuItem>
                    <MenuItem value="INDISPONIBLE">Indisponible</MenuItem>
                    <MenuItem value="INACTIF">Inactif</MenuItem>
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
