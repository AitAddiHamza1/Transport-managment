import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import type {
  CreateDocumentVehiculeInput,
  DocumentVehicule,
  UpdateDocumentVehiculeInput,
  VehicleDocumentType,
} from '../../features/documents-vehicules/types';
import { DOCUMENT_TYPE_LABELS } from '../../features/documents-vehicules/types';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';

interface VehicleDocumentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateDocumentVehiculeInput | UpdateDocumentVehiculeInput,
    file?: File,
  ) => Promise<void>;
  documentToEdit?: DocumentVehicule | null;
  initialImmatriculation?: string;
  isSubmitting?: boolean;
}

const DOCUMENT_TYPES: VehicleDocumentType[] = [
  'CARTE_GRISE',
  'ASSURANCE',
  'VISITE_TECHNIQUE',
  'VIGNETTE',
  'AUTORISATION_TRANSPORT',
  'LICENCE',
  'CERTIFICAT_IMMATRICULATION',
  'CONTRAT_LEASING',
  'DOCUMENT_DOUANIER',
  'AUTRE',
];

export function VehicleDocumentFormDialog({
  open,
  onClose,
  onSubmit,
  documentToEdit,
  initialImmatriculation,
  isSubmitting = false,
}: VehicleDocumentFormDialogProps) {
  const isEdit = Boolean(documentToEdit);

  // Vehicles list for select dropdown
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehiclesQuery({ limit: 100 });
  const vehicles = vehiclesData?.data ?? [];

  const [immatriculation, setImmatriculation] = useState('');
  const [typeDocument, setTypeDocument] = useState<VehicleDocumentType>('CARTE_GRISE');
  const [numeroDocument, setNumeroDocument] = useState('');
  const [organismeEmetteur, setOrganismeEmetteur] = useState('');
  const [dateEmission, setDateEmission] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setSelectedFile(null);
      if (documentToEdit) {
        setImmatriculation(documentToEdit.immatriculation);
        setTypeDocument(documentToEdit.typeDocument);
        setNumeroDocument(documentToEdit.numeroDocument || '');
        setOrganismeEmetteur(documentToEdit.organismeEmetteur || '');
        setDateEmission(documentToEdit.dateEmission || '');
        setDateExpiration(documentToEdit.dateExpiration || '');
        setNotes(documentToEdit.notes || '');
      } else {
        setImmatriculation(initialImmatriculation || (vehicles[0]?.immatriculation ?? ''));
        setTypeDocument('CARTE_GRISE');
        setNumeroDocument('');
        setOrganismeEmetteur('');
        setDateEmission('');
        setDateExpiration('');
        setNotes('');
      }
    }
  }, [open, documentToEdit, initialImmatriculation, vehicles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Le fichier dépasse 5 Mo');
        return;
      }
      setErrorMsg(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isEdit && !immatriculation) {
      setErrorMsg('Veuillez sélectionner un véhicule');
      return;
    }

    if (dateEmission && dateExpiration && new Date(dateExpiration) < new Date(dateEmission)) {
      setErrorMsg("La date d'expiration ne peut pas être antérieure à la date d'émission");
      return;
    }

    try {
      if (isEdit) {
        const updateData: UpdateDocumentVehiculeInput = {
          typeDocument,
          numeroDocument: numeroDocument.trim() || undefined,
          organismeEmetteur: organismeEmetteur.trim() || undefined,
          dateEmission: dateEmission || undefined,
          dateExpiration: dateExpiration || undefined,
          notes: notes.trim() || undefined,
        };
        await onSubmit(updateData, selectedFile || undefined);
      } else {
        const createData: CreateDocumentVehiculeInput = {
          immatriculation,
          typeDocument,
          numeroDocument: numeroDocument.trim() || undefined,
          organismeEmetteur: organismeEmetteur.trim() || undefined,
          dateEmission: dateEmission || undefined,
          dateExpiration: dateExpiration || undefined,
          notes: notes.trim() || undefined,
        };
        await onSubmit(createData, selectedFile || undefined);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Erreur lors de l'enregistrement");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle fontWeight={700}>
          {isEdit ? 'Modifier le document véhicule' : 'Ajouter un document véhicule'}
        </DialogTitle>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Véhicule */}
            <Grid item xs={12}>
              <FormControl fullWidth disabled={isEdit || isLoadingVehicles} required>
                <InputLabel id="vehicule-select-label">Véhicule</InputLabel>
                <Select
                  labelId="vehicule-select-label"
                  value={immatriculation}
                  label="Véhicule"
                  onChange={(e) => setImmatriculation(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <MenuItem key={v.id} value={v.immatriculation}>
                      {v.immatriculation} — {v.marque} {v.modele ? `(${v.modele})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {!immatriculation && <FormHelperText error>Sélectionnez un véhicule</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Type de Document */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="type-doc-label">Type de document</InputLabel>
                <Select
                  labelId="type-doc-label"
                  value={typeDocument}
                  label="Type de document"
                  onChange={(e) => setTypeDocument(e.target.value as VehicleDocumentType)}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Numéro de document */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Numéro de document"
                placeholder="Ex: CG-123456"
                value={numeroDocument}
                onChange={(e) => setNumeroDocument(e.target.value)}
              />
            </Grid>

            {/* Organisme émetteur */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Organisme émetteur"
                placeholder="Ex: Service des Mines, Wafa Assurance..."
                value={organismeEmetteur}
                onChange={(e) => setOrganismeEmetteur(e.target.value)}
              />
            </Grid>

            {/* Date d'émission */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date d'émission"
                InputLabelProps={{ shrink: true }}
                value={dateEmission}
                onChange={(e) => setDateEmission(e.target.value)}
              />
            </Grid>

            {/* Date d'expiration */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date d'expiration"
                InputLabelProps={{ shrink: true }}
                value={dateExpiration}
                onChange={(e) => setDateExpiration(e.target.value)}
                helperText="Laissez vide si le document n'a pas de date d'expiration"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes / Remarques"
                placeholder="Remarques complémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>

            {/* Fichier joint */}
            <Grid item xs={12}>
              <Box
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                }}
              >
                <CloudUploadIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {selectedFile
                    ? `Fichier sélectionné : ${selectedFile.name}`
                    : documentToEdit?.hasFile
                    ? `Fichier actuel : ${documentToEdit.originalFileName || 'Document joint'}`
                    : 'Joindre un fichier (PDF, JPEG, PNG, WEBP — Max 5 Mo)'}
                </Typography>
                <Button variant="outlined" component="label" size="small">
                  {selectedFile || documentToEdit?.hasFile ? 'Changer de fichier' : 'Parcourir...'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                  />
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
