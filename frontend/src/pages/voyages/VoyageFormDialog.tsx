import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import RouteIcon from '@mui/icons-material/Route';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { Voyage } from '../../features/voyages/types';
import { useClientsQuery } from '../../features/clients/useClients';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { Vehicule } from '../../features/vehicles/types';
import { Conducteur } from '../../features/conducteurs/types';
import { notify } from '../../utils/notify';

const voyageSchema = z.object({
  typeVoyage: z.enum(['NATIONAL', 'INTERNATIONAL', 'IMPORT', 'EXPORT']).default('NATIONAL'),
  modeFacturation: z.enum(['AVEC_FACTURE', 'SANS_FACTURE']).default('AVEC_FACTURE'),
  idClient: z.coerce.number().min(1, 'Veuillez sélectionner un client'),
  tracteur: z.string().optional().nullable(),
  remorque: z.string().optional().nullable(),
  nomConducteur: z.string().optional().nullable(),
  lieuChargement: z.string().min(1, 'Le lieu de chargement est requis').max(150, 'Maximum 150 caractères'),
  lieuDechargement: z.string().min(1, 'Le lieu de déchargement est requis').max(150, 'Maximum 150 caractères'),
  dateChargement: z.string().optional().nullable(),
  numeroCmr: z.string().max(50, 'Maximum 50 caractères').optional().nullable(),
  statut: z.enum(['PLANIFIE', 'EN_COURS', 'LIVRE', 'ANNULE', 'FACTURE']).default('PLANIFIE'),
  montantVoyage: z.coerce.number().min(0, 'Le montant doit être supérieur ou égal à 0').default(0),
  devise: z.enum(['MAD', 'EUR']).default('MAD'),
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

  // Progressive disclosure state
  const [hasDocumentsToggle, setHasDocumentsToggle] = useState<'NON' | 'OUI'>('NON');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [hasFraisToggle, setHasFraisToggle] = useState<'NON' | 'OUI'>('NON');
  const [prixParJour, setPrixParJour] = useState<number>(0);
  const [nombreJoursRetard, setNombreJoursRetard] = useState<number>(0);

  // Tanger Med 3 independent service toggles (Non / Oui) & inline details
  const [hasCircuitToggle, setHasCircuitToggle] = useState<'NON' | 'OUI'>('NON');
  const [circuitNature, setCircuitNature] = useState<string>('');
  const [circuitMontant, setCircuitMontant] = useState<number | ''>('');
  const [circuitNotes, setCircuitNotes] = useState<string>('');

  const [hasBateauToggle, setHasBateauToggle] = useState<'NON' | 'OUI'>('NON');
  const [dateTraversee, setDateTraversee] = useState<string>('');
  const [bateau, setBateau] = useState<string>('');
  const [lieuEmbarquement, setLieuEmbarquement] = useState<'Tanger Med' | 'Nador' | 'Almeria' | 'Algeciras'>('Tanger Med');
  const [prixBateau, setPrixBateau] = useState<number | ''>('');

  const [hasTransitToggle, setHasTransitToggle] = useState<'NON' | 'OUI'>('NON');
  const [transitTypeService, setTransitTypeService] = useState<string>('MRN');
  const [transitPrix, setTransitPrix] = useState<number | ''>('');
  const [transitNotes, setTransitNotes] = useState<string>('');

  // Fetch lookup lists
  const { data: clientsData } = useClientsQuery({ limit: 100 });
  const { data: vehiculesData } = useVehiclesQuery({ limit: 100 });
  const { data: conducteursData } = useConducteursQuery({ limit: 100 });

  const clients = clientsData?.data || [];
  const vehicules: Vehicule[] = vehiculesData?.data || [];
  const conducteurs: Conducteur[] = (conducteursData?.data || []).filter((c: Conducteur) => {
    if (!c.employe || c.employe.statut !== 'ACTIF') {
      return false;
    }
    if (voyage && voyage.nomConducteur === c.nomConducteur) {
      return true;
    }
    return c.statut === 'DISPONIBLE';
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VoyageFormValues>({
    resolver: zodResolver(voyageSchema),
    defaultValues: {
      typeVoyage: 'NATIONAL',
      modeFacturation: 'AVEC_FACTURE',
      idClient: 0,
      tracteur: '',
      remorque: '',
      nomConducteur: '',
      lieuChargement: '',
      lieuDechargement: '',
      dateChargement: '',
      numeroCmr: '',
      statut: 'PLANIFIE',
      montantVoyage: 0,
      devise: 'MAD',
    },
  });

  const selectedClientId = watch('idClient');
  const selectedCurrency = watch('devise') || 'MAD';

  const prevClientIdRef = useRef(selectedClientId);
  useEffect(() => {
    if (selectedClientId && selectedClientId !== prevClientIdRef.current) {
      const client = clients.find((c) => c.id === Number(selectedClientId));
      if (client) {
        setValue('devise', (client.deviseFacturation || 'MAD') as 'MAD' | 'EUR');
      }
      prevClientIdRef.current = selectedClientId;
    }
  }, [selectedClientId, clients, setValue]);

  useEffect(() => {
    if (voyage) {
      reset({
        typeVoyage: voyage.typeVoyage,
        modeFacturation: voyage.modeFacturation || 'AVEC_FACTURE',
        idClient: voyage.idClient || (voyage.client?.id ?? 0),
        tracteur: voyage.tracteur || '',
        remorque: voyage.remorque || '',
        nomConducteur: voyage.nomConducteur || '',
        lieuChargement: voyage.lieuChargement,
        lieuDechargement: voyage.lieuDechargement,
        dateChargement: voyage.dateChargement || '',
        numeroCmr: voyage.numeroCmr || '',
        statut: voyage.statut,
        montantVoyage: voyage.montantVoyage || 0,
        devise: (voyage.devise || 'MAD') as 'MAD' | 'EUR',
      });
      prevClientIdRef.current = voyage.idClient || (voyage.client?.id ?? 0);
      setHasDocumentsToggle('NON');
      setSelectedFiles([]);

      if (voyage.fraisImmobilisation) {
        setHasFraisToggle('OUI');
        setPrixParJour(Number(voyage.fraisImmobilisation.prixParJour));
        setNombreJoursRetard(Number(voyage.fraisImmobilisation.nombreJoursRetard));
      } else {
        setHasFraisToggle('NON');
        setPrixParJour(0);
        setNombreJoursRetard(0);
      }

      if (voyage.traverseeMaritime) {
        setHasCircuitToggle(voyage.traverseeMaritime.hasCircuitPortuaire ? 'OUI' : 'NON');
        setCircuitNature(voyage.traverseeMaritime.circuitNature || '');
        setCircuitMontant(voyage.traverseeMaritime.circuitMontant ?? '');
        setCircuitNotes(voyage.traverseeMaritime.circuitNotes || '');

        setHasBateauToggle(voyage.traverseeMaritime.hasBateau ? 'OUI' : 'NON');
        setDateTraversee(
          voyage.traverseeMaritime.dateTraversee
            ? voyage.traverseeMaritime.dateTraversee.split('T')[0]
            : voyage.dateChargement || new Date().toISOString().split('T')[0]
        );
        setBateau(voyage.traverseeMaritime.bateau || '');
        setLieuEmbarquement((voyage.traverseeMaritime.lieuEmbarquement as any) || 'Tanger Med');
        setPrixBateau(voyage.traverseeMaritime.prix ?? '');

        setHasTransitToggle(voyage.traverseeMaritime.hasTransitAljaziras ? 'OUI' : 'NON');
        setTransitTypeService(voyage.traverseeMaritime.transitTypeService || 'MRN');
        setTransitPrix(voyage.traverseeMaritime.transitPrix ?? '');
        setTransitNotes(voyage.traverseeMaritime.transitNotes || '');
      } else {
        setHasCircuitToggle('NON');
        setCircuitNature('');
        setCircuitMontant('');
        setCircuitNotes('');

        setHasBateauToggle('NON');
        setDateTraversee(voyage.dateChargement || new Date().toISOString().split('T')[0]);
        setBateau('');
        setLieuEmbarquement('Tanger Med');
        setPrixBateau('');

        setHasTransitToggle('NON');
        setTransitTypeService('MRN');
        setTransitPrix('');
        setTransitNotes('');
      }
    } else {
      const defaultClient = clients[0];
      const defaultDevise = defaultClient?.deviseFacturation || 'MAD';
      const todayStr = new Date().toISOString().split('T')[0];
      reset({
        typeVoyage: 'NATIONAL',
        modeFacturation: 'AVEC_FACTURE',
        idClient: defaultClient?.id || 0,
        tracteur: '',
        remorque: '',
        nomConducteur: '',
        lieuChargement: '',
        lieuDechargement: '',
        dateChargement: todayStr,
        numeroCmr: '',
        statut: 'PLANIFIE',
        montantVoyage: 0,
        devise: defaultDevise as 'MAD' | 'EUR',
      });
      prevClientIdRef.current = defaultClient?.id || 0;
      setHasDocumentsToggle('NON');
      setSelectedFiles([]);
      setHasFraisToggle('NON');
      setPrixParJour(0);
      setNombreJoursRetard(0);

      setHasCircuitToggle('NON');
      setCircuitNature('');
      setCircuitMontant('');
      setCircuitNotes('');

      setHasBateauToggle('NON');
      setDateTraversee(todayStr);
      setBateau('');
      setLieuEmbarquement('Tanger Med');
      setPrixBateau('');

      setHasTransitToggle('NON');
      setTransitTypeService('MRN');
      setTransitPrix('');
      setTransitNotes('');
    }
  }, [voyage, reset, open, clients]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const newFiles = Array.from(event.target.files);
    const validExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];

    for (const f of newFiles) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        notify.error(`Fichier "${f.name}" rejeté. Formats acceptés : PDF, JPEG, PNG, WEBP`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        notify.error(`Fichier "${f.name}" trop volumineux (max 5 Mo)`);
        return;
      }
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: VoyageFormValues) => {
    const payload: any = {
      typeVoyage: data.typeVoyage || 'NATIONAL',
      modeFacturation: data.modeFacturation || 'AVEC_FACTURE',
      idClient: Number(data.idClient),
      tracteur: data.tracteur?.trim() || null,
      remorque: data.remorque?.trim() || null,
      nomConducteur: data.nomConducteur?.trim() || null,
      lieuChargement: data.lieuChargement.trim(),
      lieuDechargement: data.lieuDechargement.trim(),
      dateChargement: data.dateChargement || null,
      numeroCmr: data.numeroCmr?.trim() || null,
      statut: data.statut || 'PLANIFIE',
      montantVoyage: Number(data.montantVoyage) || 0,
      devise: data.devise || 'MAD',
    };

    if (hasFraisToggle === 'OUI' && (prixParJour > 0 || nombreJoursRetard > 0)) {
      payload.fraisImmobilisation = {
        prixParJour: Number(prixParJour),
        nombreJoursRetard: Number(nombreJoursRetard),
      };
    }

    // Tanger Med 3 independent service selections + inline details
    const hasCircuit = hasCircuitToggle === 'OUI';
    const hasBateau = hasBateauToggle === 'OUI';
    const hasTransit = hasTransitToggle === 'OUI';

    payload.tangerMedServices = {
      hasCircuitPortuaire: hasCircuit,
      circuitNature: hasCircuit ? circuitNature.trim() || null : null,
      circuitMontant: hasCircuit && circuitMontant !== '' ? Number(circuitMontant) : null,
      circuitNotes: hasCircuit ? circuitNotes.trim() || null : null,

      hasBateau: hasBateau,
      dateTraversee: hasBateau && dateTraversee ? dateTraversee : null,
      bateau: hasBateau ? bateau.trim() || null : null,
      lieuEmbarquement: hasBateau ? lieuEmbarquement : null,
      prix: hasBateau && prixBateau !== '' ? Number(prixBateau) : null,
      devise: data.devise || 'MAD',

      hasTransitAljaziras: hasTransit,
      transitTypeService: hasTransit ? transitTypeService.trim() || null : null,
      transitPrix: hasTransit && transitPrix !== '' ? Number(transitPrix) : null,
      transitNotes: hasTransit ? transitNotes.trim() || null : null,
    };

    if (hasCircuit || hasBateau || hasTransit) {
      payload.hasTraversee = true;
    } else {
      payload.hasTraversee = false;
      payload.traverseeMaritime = null;
    }

    if (selectedFiles.length > 0) {
      payload.files = selectedFiles;
    }

    await onSubmit(payload);
  };

  const calculatedFraisTotal = Math.max(0, Number(prixParJour || 0) * Number(nombreJoursRetard || 0));

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? `Modifier le voyage #${voyage?.idVoyage}` : 'Planifier un nouveau voyage'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Mode de facturation */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="modeFacturation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Mode de facturation *"
                    fullWidth
                    error={Boolean(errors.modeFacturation)}
                    helperText={errors.modeFacturation?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value="AVEC_FACTURE">Avec facture</MenuItem>
                    <MenuItem value="SANS_FACTURE">Sans facture</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

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
            <Grid item xs={12} sm={4}>
              <Controller
                name="idClient"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    value={field.value || ''}
                    label="Client partner *"
                    fullWidth
                    error={Boolean(errors.idClient)}
                    helperText={errors.idClient?.message}
                    disabled={isLoading}
                  >
                    <MenuItem value={0} disabled>
                      — Sélectionnez un client —
                    </MenuItem>
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.nomEntreprise}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Vehicule Tracteur */}
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
                      .filter((v) => v.typeVehicule === 'CAMION')
                      .map((v) => (
                        <MenuItem key={v.id} value={v.immatriculation}>
                          {v.immatriculation} ({v.marque})
                        </MenuItem>
                      ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Vehicule Remorque */}
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
                      .filter((v) => v.typeVehicule === 'REMORQUE')
                      .map((v) => (
                        <MenuItem key={v.id} value={v.immatriculation}>
                          {v.immatriculation} ({v.marque})
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
                    {conducteurs.map((c) => (
                      <MenuItem key={c.id} value={c.nomConducteur}>
                        {c.nomConducteur}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Lieu de chargement */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="lieuChargement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de chargement *"
                    placeholder="ex. Casablanca Port Terminal"
                    fullWidth
                    error={Boolean(errors.lieuChargement)}
                    helperText={errors.lieuChargement?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Lieu de dechargement */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="lieuDechargement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de déchargement *"
                    placeholder="ex. Tanger Med Zone B"
                    fullWidth
                    error={Boolean(errors.lieuDechargement)}
                    helperText={errors.lieuDechargement?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Date chargement */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="dateChargement"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Date de chargement"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Numero CMR */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="numeroCmr"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Numéro CMR / Document"
                    placeholder="CMR-8849"
                    fullWidth
                    error={Boolean(errors.numeroCmr)}
                    helperText={errors.numeroCmr?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            {/* Statut Voyage */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="statut"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Statut du voyage *"
                    fullWidth
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

            {/* Montant & Devise */}
            <Grid item xs={12} sm={8}>
              <Controller
                name="montantVoyage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Montant du voyage (HT)"
                    placeholder="15000"
                    fullWidth
                    error={Boolean(errors.montantVoyage)}
                    helperText={errors.montantVoyage?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="devise"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Devise *"
                    fullWidth
                    disabled={isLoading}
                  >
                    <MenuItem value="MAD">MAD (Dirham)</MenuItem>
                    <MenuItem value="EUR">EUR (Euro)</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            {/* Section Documents Voyage */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Documents de voyage (CMR, Bon de livraison, etc.)
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    color="primary"
                    exclusive
                    value={hasDocumentsToggle}
                    onChange={(_, val) => val && setHasDocumentsToggle(val)}
                  >
                    <ToggleButton value="NON">Non</ToggleButton>
                    <ToggleButton value="OUI">Oui</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {hasDocumentsToggle === 'OUI' && (
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      size="small"
                      disabled={isLoading}
                    >
                      Ajouter des fichiers (PDF, JPG, PNG, WEBP)
                      <input type="file" multiple hidden accept=".pdf,.jpeg,.jpg,.png,.webp" onChange={handleFileSelect} />
                    </Button>

                    {selectedFiles.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        {selectedFiles.map((file, idx) => (
                          <Stack
                            key={idx}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ p: 1, border: '1px dashed #ccc', borderRadius: 1 }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <AttachFileIcon fontSize="small" color="action" />
                              <Typography variant="body2">{file.name}</Typography>
                              <Chip
                                label={`${(file.size / 1024).toFixed(0)} Ko`}
                                size="small"
                                variant="outlined"
                              />
                            </Stack>
                            <IconButton size="small" color="error" onClick={() => handleRemoveFile(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Section Frais d'immobilisation */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Frais d'immobilisation
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    color="primary"
                    exclusive
                    value={hasFraisToggle}
                    onChange={(_, val) => val && setHasFraisToggle(val)}
                  >
                    <ToggleButton value="NON">Non</ToggleButton>
                    <ToggleButton value="OUI">Oui</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {hasFraisToggle === 'OUI' && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="number"
                        label="Prix par jour"
                        placeholder="500"
                        value={prixParJour}
                        onChange={(e) => setPrixParJour(Math.max(0, Number(e.target.value)))}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="number"
                        label="Nombre de jours de retard"
                        placeholder="3"
                        value={nombreJoursRetard}
                        onChange={(e) => setNombreJoursRetard(Math.max(0, Math.floor(Number(e.target.value))))}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Montant total (aperçu)"
                        value={`${calculatedFraisTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${selectedCurrency}`}
                        fullWidth
                        size="small"
                        InputProps={{ readOnly: true }}
                        sx={{ bgcolor: 'action.hover' }}
                      />
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>

            {/* Section Tanger Med (3 services indépendants avec détails inline) */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                    Tanger Med / Services portuaires
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Activez les services portuaires requis et saisissez directement leurs informations ci-dessous.
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  {/* Service 1 : Circuit portuaire */}
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <RouteIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Circuit portuaire
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pesage, scanner, COMI, contrôle portuaire
                          </Typography>
                        </Box>
                      </Stack>
                      <ToggleButtonGroup
                        size="small"
                        color="primary"
                        exclusive
                        value={hasCircuitToggle}
                        onChange={(_, val) => val && setHasCircuitToggle(val)}
                      >
                        <ToggleButton value="NON">Non</ToggleButton>
                        <ToggleButton value="OUI">Oui</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>

                    {hasCircuitToggle === 'OUI' && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Nature du service"
                            placeholder="ex. Circuit portuaire, scanner, pesage"
                            value={circuitNature}
                            onChange={(e) => setCircuitNature(e.target.value)}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            type="number"
                            label="Montant Circuit (MAD)"
                            placeholder="500"
                            value={circuitMontant}
                            onChange={(e) => setCircuitMontant(e.target.value === '' ? '' : Number(e.target.value))}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            size="small"
                            label="Notes Circuit"
                            placeholder="Remarques ou instructions particulières"
                            value={circuitNotes}
                            onChange={(e) => setCircuitNotes(e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </Box>

                  {/* Service 2 : Bateau */}
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <DirectionsBoatIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Bateau (Traversée maritime)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Billet de ferry, embarquement maritime
                          </Typography>
                        </Box>
                      </Stack>
                      <ToggleButtonGroup
                        size="small"
                        color="primary"
                        exclusive
                        value={hasBateauToggle}
                        onChange={(_, val) => val && setHasBateauToggle(val)}
                      >
                        <ToggleButton value="NON">Non</ToggleButton>
                        <ToggleButton value="OUI">Oui</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>

                    {hasBateauToggle === 'OUI' && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            type="date"
                            label="Date de traversée"
                            InputLabelProps={{ shrink: true }}
                            value={dateTraversee}
                            onChange={(e) => setDateTraversee(e.target.value)}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Bateau / Compagnie"
                            placeholder="ex. Armas, Balearia, FRS"
                            value={bateau}
                            onChange={(e) => setBateau(e.target.value)}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            select
                            label="Lieu d'embarquement"
                            value={lieuEmbarquement}
                            onChange={(e) => setLieuEmbarquement(e.target.value as any)}
                            fullWidth
                            disabled={isLoading}
                          >
                            <MenuItem value="Tanger Med">Tanger Med</MenuItem>
                            <MenuItem value="Nador">Nador</MenuItem>
                            <MenuItem value="Almeria">Almeria</MenuItem>
                            <MenuItem value="Algeciras">Algeciras</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            type="number"
                            label="Prix Bateau (MAD)"
                            placeholder="1200"
                            value={prixBateau}
                            onChange={(e) => setPrixBateau(e.target.value === '' ? '' : Number(e.target.value))}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </Box>

                  {/* Service 3 : Transit Aljaziras */}
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <AssignmentIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Transit Aljaziras
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Services de transit (MRN, TN, FITO)
                          </Typography>
                        </Box>
                      </Stack>
                      <ToggleButtonGroup
                        size="small"
                        color="primary"
                        exclusive
                        value={hasTransitToggle}
                        onChange={(_, val) => val && setHasTransitToggle(val)}
                      >
                        <ToggleButton value="NON">Non</ToggleButton>
                        <ToggleButton value="OUI">Oui</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>

                    {hasTransitToggle === 'OUI' && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            select
                            label="Type de service"
                            value={transitTypeService}
                            onChange={(e) => setTransitTypeService(e.target.value)}
                            fullWidth
                            disabled={isLoading}
                          >
                            <MenuItem value="MRN">MRN</MenuItem>
                            <MenuItem value="TN">TN</MenuItem>
                            <MenuItem value="FITO">FITO</MenuItem>
                            <MenuItem value="Transit">Transit</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            type="number"
                            label="Prix Transit (MAD)"
                            placeholder="350"
                            value={transitPrix}
                            onChange={(e) => setTransitPrix(e.target.value === '' ? '' : Number(e.target.value))}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            size="small"
                            label="Notes Transit"
                            placeholder="Remarques ou instructions de transit"
                            value={transitNotes}
                            onChange={(e) => setTransitNotes(e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            disabled={isLoading}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </Box>
                </Stack>
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
            {isEditing ? 'Enregistrer' : 'Planifier'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
