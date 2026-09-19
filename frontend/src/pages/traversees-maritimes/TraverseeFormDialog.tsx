import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { TraverseeMaritime } from '../../features/traversees-maritimes/types';
import { LIEUX_EMBARQUEMENT } from '../../features/traversees-maritimes/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { Vehicule } from '../../features/vehicles/types';
import { Conducteur } from '../../features/conducteurs/types';
import { notify } from '../../utils/notify';

const traverseeSchema = z.object({
  immatriculation: z.string().min(1, 'Veuillez sélectionner un véhicule'),
  idConducteur: z.coerce.number().min(1, 'Veuillez sélectionner un conducteur'),
  dateTraversee: z.string().min(1, 'La date de traversée est requise'),
  bateau: z.string().min(1, 'Le nom du bateau est requis').max(100, 'Maximum 100 caractères'),
  lieuEmbarquement: z.enum(['Tanger Med', 'Nador', 'Almeria', 'Algeciras']),
  prix: z.coerce.number().min(0, 'Le prix doit être supérieur ou égal à 0'),
  devise: z.literal('MAD').default('MAD'),
});

type TraverseeFormValues = z.infer<typeof traverseeSchema>;

interface TraverseeFormDialogProps {
  open: boolean;
  traversee: TraverseeMaritime | null;
  onClose: () => void;
  onSubmit: (values: any, file?: File) => Promise<void>;
  isLoading: boolean;
}

export function TraverseeFormDialog({
  open,
  traversee,
  onClose,
  onSubmit,
  isLoading,
}: TraverseeFormDialogProps) {
  const isEditing = Boolean(traversee);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: vehiculesData } = useVehiclesQuery({ limit: 100 });
  const { data: conducteursData } = useConducteursQuery({ limit: 100 });

  const vehicules: Vehicule[] = vehiculesData?.data || [];
  const conducteurs: Conducteur[] = (conducteursData?.data || []).filter(
    (c: Conducteur) => !c.employe || c.employe.statut === 'ACTIF',
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TraverseeFormValues>({
    resolver: zodResolver(traverseeSchema),
    defaultValues: {
      immatriculation: '',
      idConducteur: 0,
      dateTraversee: new Date().toISOString().split('T')[0],
      bateau: '',
      lieuEmbarquement: 'Tanger Med',
      prix: 0,
      devise: 'MAD',
    },
  });

  useEffect(() => {
    if (traversee) {
      reset({
        immatriculation: traversee.immatriculation,
        idConducteur: traversee.idConducteur,
        dateTraversee: traversee.dateTraversee,
        bateau: traversee.bateau,
        lieuEmbarquement: traversee.lieuEmbarquement,
        prix: traversee.prix,
        devise: 'MAD',
      });
      setSelectedFile(null);
    } else {
      reset({
        immatriculation: '',
        idConducteur: 0,
        dateTraversee: new Date().toISOString().split('T')[0],
        bateau: '',
        lieuEmbarquement: 'Tanger Med',
        prix: 0,
        devise: 'MAD',
      });
      setSelectedFile(null);
    }
  }, [traversee, reset, open]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const validExtensions = ['.pdf', '.jpeg', '.jpg', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      notify.error(`Fichier "${file.name}" rejeté. Formats acceptés : PDF, JPEG, PNG`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(`Fichier "${file.name}" trop volumineux (max 5 Mo)`);
      return;
    }
    setSelectedFile(file);
  };

  const handleFormSubmit = async (data: TraverseeFormValues) => {
    await onSubmit({ ...data, devise: 'MAD' }, selectedFile || undefined);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing
          ? `Modifier la traversée maritime #${traversee?.id}`
          : 'Enregistrer une nouvelle traversée maritime'}
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
                    label="Véhicule *"
                    fullWidth
                    error={Boolean(errors.immatriculation)}
                    helperText={errors.immatriculation?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="" disabled>
                      — Sélectionnez un véhicule —
                    </MenuItem>
                    {vehicules.map((v) => (
                      <MenuItem key={v.id} value={v.immatriculation}>
                        {v.immatriculation} ({v.marque || 'Véhicule'})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Conducteur */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="idConducteur"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    value={field.value || ''}
                    label="Conducteur *"
                    fullWidth
                    error={Boolean(errors.idConducteur)}
                    helperText={errors.idConducteur?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value={0} disabled>
                      — Sélectionnez un conducteur —
                    </MenuItem>
                    {conducteurs.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.nomConducteur} ({c.statut})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Date de traversée */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="dateTraversee"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Date de traversée *"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    error={Boolean(errors.dateTraversee)}
                    helperText={errors.dateTraversee?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Bateau */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="bateau"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Bateau *"
                    placeholder="ex. GNV Atlas"
                    fullWidth
                    error={Boolean(errors.bateau)}
                    helperText={errors.bateau?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Lieu d'embarquement */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="lieuEmbarquement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Lieu d'embarquement *"
                    fullWidth
                    error={Boolean(errors.lieuEmbarquement)}
                    helperText={errors.lieuEmbarquement?.message}
                    disabled={isLoading}
                  >
                    {LIEUX_EMBARQUEMENT.map((lieu) => (
                      <MenuItem key={lieu} value={lieu}>
                        {lieu}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Prix (MAD) */}
            <Grid item xs={12}>
              <Controller
                name="prix"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Prix (MAD) *"
                    placeholder="3500"
                    fullWidth
                    error={Boolean(errors.prix)}
                    helperText={errors.prix?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Justificatif attachment */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Justificatif de traversée
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  size="small"
                  disabled={isLoading}
                >
                  Choisir un fichier (PDF, JPEG, PNG, max 5 Mo)
                  <input type="file" hidden accept=".pdf,.jpeg,.jpg,.png" onChange={handleFileSelect} />
                </Button>

                {selectedFile && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ p: 1, mt: 1.5, border: '1px dashed #ccc', borderRadius: 1 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AttachFileIcon fontSize="small" color="action" />
                      <Typography variant="body2">{selectedFile.name}</Typography>
                      <Chip
                        label={`${(selectedFile.size / 1024).toFixed(0)} Ko`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <Button size="small" color="error" onClick={() => setSelectedFile(null)}>
                      <DeleteIcon fontSize="small" />
                    </Button>
                  </Stack>
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
