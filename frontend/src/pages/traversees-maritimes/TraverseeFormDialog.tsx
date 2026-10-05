import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
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
import RouteIcon from '@mui/icons-material/Route';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import type { TraverseeMaritime } from '../../features/traversees-maritimes/types';
import { LIEUX_EMBARQUEMENT } from '../../features/traversees-maritimes/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { Vehicule } from '../../features/vehicles/types';
import { Conducteur } from '../../features/conducteurs/types';
import { notify } from '../../utils/notify';

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

  // General fields
  const [dateOperation, setDateOperation] = useState<string>(new Date().toISOString().split('T')[0]);
  const [immatriculation, setImmatriculation] = useState<string>('');
  const [idConducteur, setIdConducteur] = useState<number>(0);

  // Section 1: Circuit Portuaire
  const [hasCircuit, setHasCircuit] = useState<boolean>(false);
  const [circuitNature, setCircuitNature] = useState<string>('');
  const [circuitMontant, setCircuitMontant] = useState<number | ''>('');
  const [circuitNotes, setCircuitNotes] = useState<string>('');

  // Section 2: Bateau
  const [hasBateau, setHasBateau] = useState<boolean>(true);
  const [dateTraversee, setDateTraversee] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bateau, setBateau] = useState<string>('');
  const [lieuEmbarquement, setLieuEmbarquement] = useState<'Tanger Med' | 'Nador' | 'Almeria' | 'Algeciras'>('Tanger Med');
  const [prixBateau, setPrixBateau] = useState<number | ''>('');

  // Section 3: Transit Aljaziras
  const [hasTransit, setHasTransit] = useState<boolean>(false);
  const [transitTypeService, setTransitTypeService] = useState<string>('MRN');
  const [transitPrix, setTransitPrix] = useState<number | ''>('');
  const [transitNotes, setTransitNotes] = useState<string>('');

  const { data: vehiculesData } = useVehiclesQuery({ limit: 100 });
  const { data: conducteursData } = useConducteursQuery({ limit: 100 });

  const vehicules: Vehicule[] = vehiculesData?.data || [];
  const conducteurs: Conducteur[] = (conducteursData?.data || []).filter(
    (c: Conducteur) => !c.employe || c.employe.statut === 'ACTIF',
  );

  useEffect(() => {
    if (traversee) {
      setDateOperation(traversee.dateOperation ? traversee.dateOperation.split('T')[0] : new Date().toISOString().split('T')[0]);
      setImmatriculation(traversee.immatriculation ?? '');
      setIdConducteur(traversee.idConducteur ?? 0);

      // Section 1
      setHasCircuit(Boolean(traversee.hasCircuitPortuaire));
      setCircuitNature(traversee.circuitNature ?? '');
      setCircuitMontant(traversee.circuitMontant ?? '');
      setCircuitNotes(traversee.circuitNotes ?? '');

      // Section 2
      setHasBateau(Boolean(traversee.hasBateau));
      setDateTraversee(traversee.dateTraversee ? traversee.dateTraversee.split('T')[0] : new Date().toISOString().split('T')[0]);
      setBateau(traversee.bateau ?? '');
      setLieuEmbarquement((traversee.lieuEmbarquement as any) || 'Tanger Med');
      setPrixBateau(traversee.prix ?? '');

      // Section 3
      setHasTransit(Boolean(traversee.hasTransitAljaziras));
      setTransitTypeService(traversee.transitTypeService ?? 'MRN');
      setTransitPrix(traversee.transitPrix ?? '');
      setTransitNotes(traversee.transitNotes ?? '');

      setSelectedFile(null);
    } else {
      setDateOperation(new Date().toISOString().split('T')[0]);
      setImmatriculation('');
      setIdConducteur(0);

      setHasCircuit(false);
      setCircuitNature('');
      setCircuitMontant('');
      setCircuitNotes('');

      setHasBateau(true);
      setDateTraversee(new Date().toISOString().split('T')[0]);
      setBateau('');
      setLieuEmbarquement('Tanger Med');
      setPrixBateau('');

      setHasTransit(false);
      setTransitTypeService('MRN');
      setTransitPrix('');
      setTransitNotes('');

      setSelectedFile(null);
    }
  }, [traversee, open]);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasCircuit && !hasBateau && !hasTransit) {
      notify.error('Une opération Tanger Med doit comporter au moins un service activé (Circuit portuaire, Bateau ou Transit Aljaziras).');
      return;
    }

    if (hasBateau && (!bateau.trim())) {
      notify.error('Veuillez renseigner le nom du bateau pour le service Bateau.');
      return;
    }

    const payload: any = {
      dateOperation,
      immatriculation: immatriculation.trim() || null,
      idConducteur: idConducteur > 0 ? Number(idConducteur) : null,

      // Section 1: Circuit
      hasCircuitPortuaire: hasCircuit,
      circuitNature: hasCircuit ? circuitNature.trim() || null : null,
      circuitMontant: hasCircuit && circuitMontant !== '' ? Number(circuitMontant) : null,
      circuitNotes: hasCircuit ? circuitNotes.trim() || null : null,

      // Section 2: Bateau
      hasBateau: hasBateau,
      dateTraversee: hasBateau ? dateTraversee : null,
      bateau: hasBateau ? bateau.trim() || null : null,
      lieuEmbarquement: hasBateau ? lieuEmbarquement : null,
      prix: hasBateau && prixBateau !== '' ? Number(prixBateau) : null,
      devise: 'MAD',

      // Section 3: Transit
      hasTransitAljaziras: hasTransit,
      transitTypeService: hasTransit ? transitTypeService.trim() || null : null,
      transitPrix: hasTransit && transitPrix !== '' ? Number(transitPrix) : null,
      transitNotes: hasTransit ? transitNotes.trim() || null : null,
    };

    await onSubmit(payload, selectedFile || undefined);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing
          ? `Modifier l'opération Tanger Med #${traversee?.id}`
          : 'Nouvelle opération Tanger Med'}
      </DialogTitle>
      <form onSubmit={handleFormSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* General Info */}
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                label="Date d'opération *"
                InputLabelProps={{ shrink: true }}
                value={dateOperation}
                onChange={(e) => setDateOperation(e.target.value)}
                fullWidth
                size="small"
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Véhicule (optionnel)"
                value={immatriculation}
                onChange={(e) => setImmatriculation(e.target.value)}
                fullWidth
                size="small"
                disabled={isLoading}
              >
                <MenuItem value="">— Aucun véhicule —</MenuItem>
                {vehicules.map((v) => (
                  <MenuItem key={v.id} value={v.immatriculation}>
                    {v.immatriculation} ({v.marque || 'Véhicule'})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Conducteur (optionnel)"
                value={idConducteur}
                onChange={(e) => setIdConducteur(Number(e.target.value))}
                fullWidth
                size="small"
                disabled={isLoading}
              >
                <MenuItem value={0}>— Aucun conducteur —</MenuItem>
                {conducteurs.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nomConducteur}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* SECTION 1 : CIRCUIT PORTUAIRE */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: hasCircuit ? 'action.hover' : 'background.paper' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <RouteIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      1. Circuit portuaire
                    </Typography>
                    {traversee?.circuitEstVerifie && (
                      <Chip icon={<TaskAltIcon />} label="Vérifié" color="success" size="small" />
                    )}
                  </Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={hasCircuit}
                        disabled={isLoading || Boolean(traversee?.circuitEstVerifie)}
                        onChange={(e) => setHasCircuit(e.target.checked)}
                      />
                    }
                    label="Activer ce service"
                  />
                </Stack>

                {hasCircuit && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Nature du service"
                        placeholder="ex. Pesage, Scanner, COMI"
                        value={circuitNature}
                        onChange={(e) => setCircuitNature(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        type="number"
                        label="Montant (MAD)"
                        placeholder="500"
                        value={circuitMontant}
                        onChange={(e) => setCircuitMontant(e.target.value === '' ? '' : Number(e.target.value))}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Notes & remarques"
                        placeholder="Remarques spécifiques au circuit portuaire..."
                        value={circuitNotes}
                        onChange={(e) => setCircuitNotes(e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>

            {/* SECTION 2 : BATEAU */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: hasBateau ? 'action.hover' : 'background.paper' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <DirectionsBoatIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      2. Bateau (Traversée maritime)
                    </Typography>
                    {traversee?.estVerifiee && (
                      <Chip icon={<TaskAltIcon />} label="Vérifié" color="success" size="small" />
                    )}
                  </Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={hasBateau}
                        disabled={isLoading || Boolean(traversee?.estVerifiee)}
                        onChange={(e) => setHasBateau(e.target.checked)}
                      />
                    }
                    label="Activer ce service"
                  />
                </Stack>

                {hasBateau && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="date"
                        label="Date de traversée *"
                        InputLabelProps={{ shrink: true }}
                        value={dateTraversee}
                        onChange={(e) => setDateTraversee(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Bateau *"
                        placeholder="ex. GNV Atlas"
                        value={bateau}
                        onChange={(e) => setBateau(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="Lieu d'embarquement *"
                        value={lieuEmbarquement}
                        onChange={(e) => setLieuEmbarquement(e.target.value as any)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      >
                        {LIEUX_EMBARQUEMENT.map((lieu) => (
                          <MenuItem key={lieu} value={lieu}>
                            {lieu}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        type="number"
                        label="Prix (MAD)"
                        placeholder="3500"
                        value={prixBateau}
                        onChange={(e) => setPrixBateau(e.target.value === '' ? '' : Number(e.target.value))}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>

                    {/* Justificatif attachment */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Justificatif de traversée (Billet / Reçu)
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
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
                            sx={{ p: 1, mt: 1, border: '1px dashed #ccc', borderRadius: 1 }}
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
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>

            {/* SECTION 3 : TRANSIT ALJAZIRAS */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: hasTransit ? 'action.hover' : 'background.paper' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AssignmentIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      3. Transit Aljaziras
                    </Typography>
                    {traversee?.transitEstVerifie && (
                      <Chip icon={<TaskAltIcon />} label="Vérifié" color="success" size="small" />
                    )}
                  </Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={hasTransit}
                        disabled={isLoading || Boolean(traversee?.transitEstVerifie)}
                        onChange={(e) => setHasTransit(e.target.checked)}
                      />
                    }
                    label="Activer ce service"
                  />
                </Stack>

                {hasTransit && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Type de service"
                        value={transitTypeService}
                        onChange={(e) => setTransitTypeService(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      >
                        <MenuItem value="MRN">MRN</MenuItem>
                        <MenuItem value="TN">TN</MenuItem>
                        <MenuItem value="FITO">FITO</MenuItem>
                        <MenuItem value="Transit">Transit Général</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        type="number"
                        label="Prix (MAD)"
                        placeholder="350"
                        value={transitPrix}
                        onChange={(e) => setTransitPrix(e.target.value === '' ? '' : Number(e.target.value))}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Notes & remarques"
                        placeholder="Remarques transit..."
                        value={transitNotes}
                        onChange={(e) => setTransitNotes(e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        size="small"
                        disabled={isLoading}
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
