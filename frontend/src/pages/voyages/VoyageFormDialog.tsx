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
import { Voyage } from '../../features/voyages/types';
import { useClientsQuery } from '../../features/clients/useClients';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { Vehicule } from '../../features/vehicles/types';
import { Conducteur } from '../../features/conducteurs/types';

const voyageSchema = z.object({
  typeVoyage: z.enum(['NATIONAL', 'INTERNATIONAL', 'IMPORT', 'EXPORT']).default('NATIONAL'),
  tracteur: z.string().optional().nullable(),
  remorque: z.string().optional().nullable(),
  nomConducteur: z.string().optional().nullable(),
  nomClient: z.string().optional().nullable(),
  lieuChargement: z.string().min(1, 'Le lieu de chargement est requis').max(150, 'Maximum 150 caractères'),
  lieuDechargement: z.string().min(1, 'Le lieu de déchargement est requis').max(150, 'Maximum 150 caractères'),
  dateChargement: z.string().optional().nullable(),
  numeroCmr: z.string().max(50, 'Maximum 50 caractères').optional().nullable(),
  statut: z.enum(['PLANIFIE', 'EN_COURS', 'LIVRE', 'ANNULE', 'FACTURE']).default('PLANIFIE'),
  montantVoyage: z.coerce.number().min(0, 'Le montant doit être supérieur ou égal à 0').default(0),
});

type VoyageFormValues = z.infer<typeof voyageSchema>;

interface VoyageFormDialogProps {
  open: boolean;
  voyage: Voyage | null;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  isLoading: boolean;
}

export function VoyageFormDialog({
  open,
  voyage,
  onClose,
  onSubmit,
  isLoading,
}: VoyageFormDialogProps) {
  const isEditing = Boolean(voyage);

  // Fetch lookup lists
  const { data: clientsData } = useClientsQuery({ limit: 100 });
  const { data: vehiculesData } = useVehiclesQuery({ limit: 100 });
  const { data: conducteursData } = useConducteursQuery({ limit: 100 });

  const clients = clientsData?.data || [];
  const vehicules: Vehicule[] = vehiculesData?.data || [];
  const conducteurs: Conducteur[] = conducteursData?.data || [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VoyageFormValues>({
    resolver: zodResolver(voyageSchema),
    defaultValues: {
      typeVoyage: 'NATIONAL',
      tracteur: '',
      remorque: '',
      nomConducteur: '',
      nomClient: '',
      lieuChargement: '',
      lieuDechargement: '',
      dateChargement: '',
      numeroCmr: '',
      statut: 'PLANIFIE',
      montantVoyage: 0,
    },
  });

  useEffect(() => {
    if (voyage) {
      reset({
        typeVoyage: voyage.typeVoyage,
        tracteur: voyage.tracteur || '',
        remorque: voyage.remorque || '',
        nomConducteur: voyage.nomConducteur || '',
        nomClient: voyage.nomClient || '',
        lieuChargement: voyage.lieuChargement,
        lieuDechargement: voyage.lieuDechargement,
        dateChargement: voyage.dateChargement || '',
        numeroCmr: voyage.numeroCmr || '',
        statut: voyage.statut,
        montantVoyage: voyage.montantVoyage || 0,
      });
    } else {
      reset({
        typeVoyage: 'NATIONAL',
        tracteur: '',
        remorque: '',
        nomConducteur: '',
        nomClient: '',
        lieuChargement: '',
        lieuDechargement: '',
        dateChargement: new Date().toISOString().split('T')[0],
        numeroCmr: '',
        statut: 'PLANIFIE',
        montantVoyage: 0,
      });
    }
  }, [voyage, reset, open]);

  const handleFormSubmit = async (data: VoyageFormValues) => {
    const payload = {
      typeVoyage: data.typeVoyage || 'NATIONAL',
      tracteur: data.tracteur?.trim() || null,
      remorque: data.remorque?.trim() || null,
      nomConducteur: data.nomConducteur?.trim() || null,
      nomClient: data.nomClient?.trim() || null,
      lieuChargement: data.lieuChargement.trim(),
      lieuDechargement: data.lieuDechargement.trim(),
      dateChargement: data.dateChargement || null,
      numeroCmr: data.numeroCmr?.trim() || null,
      statut: data.statut || 'PLANIFIE',
      montantVoyage: Number(data.montantVoyage) || 0,
    };
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier le voyage #${voyage?.idVoyage}` : 'Planifier un nouveau voyage'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Type Voyage */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="typeVoyage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Type de voyage *"
                    fullWidth
                    error={Boolean(errors.typeVoyage)}
                    helperText={errors.typeVoyage?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="NATIONAL">National</MenuItem>
                    <MenuItem value="INTERNATIONAL">International</MenuItem>
                    <MenuItem value="IMPORT">Import</MenuItem>
                    <MenuItem value="EXPORT">Export</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            {/* Client */}
            <Grid item xs={12} sm={8}>
              <Controller
                name="nomClient"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    value={field.value || ''}
                    label="Client partenaire"
                    fullWidth
                    disabled={isLoading}
                  >
                    <MenuItem value="">— Aucun client sélectionné —</MenuItem>
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={c.nomEntreprise}>
                        {c.nomEntreprise} {c.ice ? `(ICE: ${c.ice})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Lieu Chargement */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="lieuChargement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de chargement / départ *"
                    placeholder="Casablanca Port"
                    fullWidth
                    error={Boolean(errors.lieuChargement)}
                    helperText={errors.lieuChargement?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Lieu Dechargement */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="lieuDechargement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de déchargement / arrivée *"
                    placeholder="Tanger Med"
                    fullWidth
                    error={Boolean(errors.lieuDechargement)}
                    helperText={errors.lieuDechargement?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Date Chargement */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="dateChargement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    value={field.value || ''}
                    label="Date de chargement"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    error={Boolean(errors.dateChargement)}
                    helperText={errors.dateChargement?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Numéro CMR */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="numeroCmr"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label="N° Lettre de voiture (CMR)"
                    placeholder="CMR-2026-0089"
                    fullWidth
                    error={Boolean(errors.numeroCmr)}
                    helperText={errors.numeroCmr?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Véhicule Tracteur */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="tracteur"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    value={field.value || ''}
                    label="Véhicule Tracteur"
                    fullWidth
                    disabled={isLoading}
                  >
                    <MenuItem value="">— Aucun tracteur —</MenuItem>
                    {vehicules
                      .filter((v: Vehicule) => v.typeVehicule === 'TRACTEUR' || v.typeVehicule === 'CAMION')
                      .map((v: Vehicule) => (
                        <MenuItem key={v.id} value={v.immatriculation}>
                          {v.immatriculation} ({v.marque || 'Tracteur'})
                        </MenuItem>
                      ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Véhicule Remorque */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="remorque"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    value={field.value || ''}
                    label="Véhicule Remorque"
                    fullWidth
                    disabled={isLoading}
                  >
                    <MenuItem value="">— Aucune remorque —</MenuItem>
                    {vehicules
                      .filter((v: Vehicule) => v.typeVehicule === 'REMORQUE')
                      .map((v: Vehicule) => (
                        <MenuItem key={v.id} value={v.immatriculation}>
                          {v.immatriculation} ({v.marque || 'Remorque'})
                        </MenuItem>
                      ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Conducteur */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="nomConducteur"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    value={field.value || ''}
                    label="Conducteur principal"
                    fullWidth
                    disabled={isLoading}
                  >
                    <MenuItem value="">— Aucun conducteur —</MenuItem>
                    {conducteurs.map((c: Conducteur) => (
                      <MenuItem key={c.id} value={c.nomConducteur}>
                        {c.nomConducteur} ({c.statut})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Montant Voyage */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="montantVoyage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Montant du voyage (MAD)"
                    placeholder="12500"
                    fullWidth
                    error={Boolean(errors.montantVoyage)}
                    helperText={errors.montantVoyage?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Statut */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="statut"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Statut *"
                    fullWidth
                    error={Boolean(errors.statut)}
                    helperText={errors.statut?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="PLANIFIE">Planifié</MenuItem>
                    <MenuItem value="EN_COURS">En cours</MenuItem>
                    <MenuItem value="LIVRE">Livré</MenuItem>
                    <MenuItem value="ANNULE">Annulé</MenuItem>
                    <MenuItem value="FACTURE">Facturé</MenuItem>
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
            {isEditing ? 'Enregistrer' : 'Planifier'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
