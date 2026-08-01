import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState, useEffect, ChangeEvent } from 'react';
import {
  ContratType,
  Employe,
  EmployeStatut,
  PaiementModeEmploye,
} from '../../features/employes/types';
import {
  useCreateEmploye,
  useUpdateEmploye,
  useUploadEmployePhoto,
  useDeleteEmployePhoto,
} from '../../features/employes/useEmployes';
import { employesApi } from '../../features/employes/employesApi';

const CONTRAT_TYPES: { value: ContratType; label: string }[] = [
  { value: 'CDI', label: 'CDI — Contrat à Durée Indéterminée' },
  { value: 'CDD', label: 'CDD — Contrat à Durée Déterminée' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'TEMPORAIRE', label: 'Intérim / Temporaire' },
  { value: 'FREELANCE', label: 'Freelance' },
];

const EMPLOYE_STATUTS: { value: EmployeStatut; label: string }[] = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'SUSPENDU', label: 'Suspendu' },
  { value: 'DEMISSIONNAIRE', label: 'Démissionnaire' },
  { value: 'LICENCIE', label: 'Licencié' },
  { value: 'RETRAITE', label: 'Retraité' },
  { value: 'INACTIF', label: 'Inactif' },
];

const PAIEMENT_MODES: { value: PaiementModeEmploye; label: string }[] = [
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
];

const DEPARTURE_STATUSES: EmployeStatut[] = ['DEMISSIONNAIRE', 'LICENCIE', 'RETRAITE'];

interface EmployeFormDialogProps {
  open: boolean;
  onClose: () => void;
  employe: Employe | null;
}

export function EmployeFormDialog({ open, onClose, employe }: EmployeFormDialogProps) {
  const isEdit = Boolean(employe);

  // Form fields
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [cin, setCin] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [poste, setPoste] = useState('');
  const [departement, setDepartement] = useState('');
  const [dateEmbauche, setDateEmbauche] = useState('');
  const [typeContrat, setTypeContrat] = useState<ContratType | ''>('');
  const [statut, setStatut] = useState<EmployeStatut>('ACTIF');
  const [dateSortie, setDateSortie] = useState('');
  const [motifSortie, setMotifSortie] = useState('');
  const [salaireBase, setSalaireBase] = useState<string>('');
  const [modePaiement, setModePaiement] = useState<PaiementModeEmploye | ''>('');
  const [nomBanque, setNomBanque] = useState('');
  const [rib, setRib] = useState('');
  const [observations, setObservations] = useState('');

  // Photo state
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | null>(null);

  // Validation & error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateEmploye();
  const updateMutation = useUpdateEmploye();
  const uploadPhotoMutation = useUploadEmployePhoto();
  const deletePhotoMutation = useDeleteEmployePhoto();

  useEffect(() => {
    if (employe) {
      setNom(employe.nom);
      setPrenom(employe.prenom);
      setCin(employe.cin || '');
      setDateNaissance(employe.dateNaissance || '');
      setTelephone(employe.telephone || '');
      setEmail(employe.email || '');
      setAdresse(employe.adresse || '');
      setPoste(employe.poste);
      setDepartement(employe.departement || '');
      setDateEmbauche(employe.dateEmbauche);
      setTypeContrat(employe.typeContrat);
      setStatut(employe.statut);
      setDateSortie(employe.dateSortie || '');
      setMotifSortie(employe.motifSortie || '');
      setSalaireBase(employe.salaireBase !== null ? String(employe.salaireBase) : '');
      setModePaiement(employe.modePaiement || '');
      setNomBanque(employe.nomBanque || '');
      setRib(employe.rib || '');
      setObservations(employe.observations || '');
      setPhotoPreview(employe.hasPhoto ? employesApi.getPhotoUrl(employe.id) : null);
    } else {
      setNom('');
      setPrenom('');
      setCin('');
      setDateNaissance('');
      setTelephone('');
      setEmail('');
      setAdresse('');
      setPoste('');
      setDepartement('');
      setDateEmbauche(new Date().toISOString().split('T')[0]);
      setTypeContrat('');
      setStatut('ACTIF');
      setDateSortie('');
      setMotifSortie('');
      setSalaireBase('');
      setModePaiement('');
      setNomBanque('');
      setRib('');
      setObservations('');
      setPhotoPreview(null);
    }
    setSelectedPhoto(null);
    setPhotoUploadError(null);
    setCreatedEmployeeId(null);
    setErrors({});
    setApiError(null);
  }, [employe, open]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setPhotoUploadError('La taille de la photo ne doit pas dépasser 5 Mo');
        return;
      }
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoUploadError(null);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nom.trim()) errs.nom = 'Le nom est obligatoire';
    if (!prenom.trim()) errs.prenom = 'Le prénom est obligatoire';
    if (!poste.trim()) errs.poste = 'Le poste est obligatoire';
    if (!dateEmbauche) errs.dateEmbauche = 'La date d’embauche est obligatoire';
    if (!typeContrat) errs.typeContrat = 'Le type de contrat est obligatoire';

    if (DEPARTURE_STATUSES.includes(statut)) {
      if (!dateSortie) {
        errs.dateSortie = 'La date de sortie est obligatoire pour les statuts de départ';
      } else if (new Date(dateSortie) < new Date(dateEmbauche)) {
        errs.dateSortie = 'La date de sortie doit être égale ou supérieure à la date d’embauche';
      }
    }

    if (salaireBase !== '' && salaireBase !== null) {
      const parsedSalary = parseFloat(salaireBase);
      if (isNaN(parsedSalary) || parsedSalary < 0) {
        errs.salaireBase = 'Le salaire de base doit être un nombre positif';
      }
    }

    if (modePaiement === 'VIREMENT') {
      if (!nomBanque.trim()) errs.nomBanque = 'Le nom de la banque est obligatoire pour un virement';
      if (!rib.trim()) errs.rib = 'Le RIB est obligatoire pour un virement';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setApiError(null);

    const payload: any = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      cin: cin.trim() || undefined,
      dateNaissance: dateNaissance || undefined,
      telephone: telephone.trim() || undefined,
      email: email.trim() || undefined,
      adresse: adresse.trim() || undefined,
      poste: poste.trim(),
      departement: departement.trim() || undefined,
      dateEmbauche,
      typeContrat: typeContrat as ContratType,
      statut,
      dateSortie: dateSortie || undefined,
      motifSortie: motifSortie.trim() || undefined,
      salaireBase: salaireBase !== '' ? parseFloat(salaireBase) : null,
      modePaiement: modePaiement || null,
      nomBanque: nomBanque.trim() || undefined,
      rib: rib.trim() || undefined,
      observations: observations.trim() || undefined,
    };

    try {
      if (isEdit && employe) {
        const updated = await updateMutation.mutateAsync({ id: employe.id, data: payload });
        if (selectedPhoto) {
          try {
            await uploadPhotoMutation.mutateAsync({ id: updated.id, file: selectedPhoto });
          } catch (photoErr: any) {
            setPhotoUploadError(photoErr.response?.data?.message || 'Erreur lors de l’envoi de la photo');
            return;
          }
        }
        onClose();
      } else {
        // Create 2-step workflow
        const created = await createMutation.mutateAsync(payload);
        setCreatedEmployeeId(created.id);

        if (selectedPhoto) {
          try {
            await uploadPhotoMutation.mutateAsync({ id: created.id, file: selectedPhoto });
            onClose();
          } catch (photoErr: any) {
            // Employee creation succeeds, show photo upload retry option
            setPhotoUploadError(
              photoErr.response?.data?.message ||
                'L’employé a été créé avec succès, mais le téléversement de la photo a échoué. Vous pouvez réessayer ci-dessous.',
            );
          }
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Une erreur est survenue lors de l’enregistrement');
    }
  };

  const handleRetryPhotoUpload = async () => {
    const empId = createdEmployeeId || (employe ? employe.id : null);
    if (!empId || !selectedPhoto) return;

    try {
      await uploadPhotoMutation.mutateAsync({ id: empId, file: selectedPhoto });
      onClose();
    } catch (photoErr: any) {
      setPhotoUploadError(photoErr.response?.data?.message || 'Échec du téléversement de la photo');
    }
  };

  const handleRemovePhoto = async () => {
    if (employe && employe.hasPhoto && !selectedPhoto) {
      try {
        await deletePhotoMutation.mutateAsync(employe.id);
      } catch (err: any) {
        setApiError(err.response?.data?.message || 'Échec de la suppression de la photo');
        return;
      }
    }
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || uploadPhotoMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEdit ? `Modifier l’employé — ${employe?.matricule}` : 'Nouvel Employé'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {apiError && <Alert severity="error">{apiError}</Alert>}
          {photoUploadError && (
            <Alert
              severity="warning"
              action={
                createdEmployeeId && selectedPhoto ? (
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleRetryPhotoUpload}
                    disabled={uploadPhotoMutation.isPending}
                  >
                    Réessayer
                  </Button>
                ) : undefined
              }
            >
              {photoUploadError}
            </Alert>
          )}

          {/* Section 1: Photo & Personal Info */}
          <Box>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
              1. INFORMATIONS PERSONNELLES
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3} sx={{ textAlign: 'center' }}>
                <Avatar
                  src={photoPreview || undefined}
                  sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'primary.main' }}
                />
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={<PhotoCameraIcon />}
                  >
                    Photo
                    <input
                      type="file"
                      hidden
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePhotoChange}
                    />
                  </Button>
                  {photoPreview && (
                    <Button
                      variant="text"
                      color="error"
                      size="small"
                      onClick={handleRemovePhoto}
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nom *"
                      fullWidth
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      error={Boolean(errors.nom)}
                      helperText={errors.nom}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Prénom *"
                      fullWidth
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      error={Boolean(errors.prenom)}
                      helperText={errors.prenom}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="N° CIN"
                      fullWidth
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      placeholder="Ex: AB123456"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Date de naissance"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Téléphone"
                  fullWidth
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Adresse"
                  fullWidth
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section 2: Professional Info */}
          <Box>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
              2. INFORMATIONS PROFESSIONNELLES
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Poste *"
                  fullWidth
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                  error={Boolean(errors.poste)}
                  helperText={errors.poste}
                  placeholder="Ex: Responsable Logistique"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Département"
                  fullWidth
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value)}
                  placeholder="Ex: Exploitation, RH, Comptabilité"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d’embauche *"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dateEmbauche}
                  onChange={(e) => setDateEmbauche(e.target.value)}
                  error={Boolean(errors.dateEmbauche)}
                  helperText={errors.dateEmbauche}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Type de contrat *"
                  fullWidth
                  value={typeContrat}
                  onChange={(e) => setTypeContrat(e.target.value as ContratType)}
                  error={Boolean(errors.typeContrat)}
                  helperText={errors.typeContrat || 'Sélectionner le contrat d’embauche'}
                >
                  <MenuItem value="">
                    <em>Sélectionner un contrat</em>
                  </MenuItem>
                  {CONTRAT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Statut *"
                  fullWidth
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as EmployeStatut)}
                >
                  {EMPLOYE_STATUTS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {DEPARTURE_STATUSES.includes(statut) && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Date de sortie *"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={dateSortie}
                      onChange={(e) => setDateSortie(e.target.value)}
                      error={Boolean(errors.dateSortie)}
                      helperText={errors.dateSortie}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Motif de sortie"
                      fullWidth
                      value={motifSortie}
                      onChange={(e) => setMotifSortie(e.target.value)}
                      placeholder="Ex: Démission volontaire, fin de contrat"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Section 3: Financial & Payment Info */}
          <Box>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
              3. INFORMATIONS FINANCIÈRES ET BANCAIRES
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Salaire de base (MAD)"
                  type="number"
                  fullWidth
                  inputProps={{ step: '0.01', min: 0 }}
                  value={salaireBase}
                  onChange={(e) => setSalaireBase(e.target.value)}
                  error={Boolean(errors.salaireBase)}
                  helperText={
                    errors.salaireBase || 'Référence indicative uniquement (laisser vide si non configuré)'
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Mode de paiement"
                  fullWidth
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value as PaiementModeEmploye)}
                >
                  <MenuItem value="">
                    <em>Non configuré</em>
                  </MenuItem>
                  {PAIEMENT_MODES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {modePaiement === 'VIREMENT' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nom de la banque *"
                      fullWidth
                      value={nomBanque}
                      onChange={(e) => setNomBanque(e.target.value)}
                      error={Boolean(errors.nomBanque)}
                      helperText={errors.nomBanque}
                      placeholder="Ex: Attijariwafa Bank"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="RIB (24 chiffres) *"
                      fullWidth
                      value={rib}
                      onChange={(e) => setRib(e.target.value)}
                      error={Boolean(errors.rib)}
                      helperText={errors.rib}
                      placeholder="Ex: 245780000123456789012345"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  label="Observations / Remarques"
                  multiline
                  rows={2}
                  fullWidth
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} /> : undefined}
        >
          {isEdit ? 'Enregistrer les modifications' : 'Créer l’employé'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
