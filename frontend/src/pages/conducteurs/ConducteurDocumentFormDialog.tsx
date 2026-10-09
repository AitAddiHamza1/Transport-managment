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
  ConducteurDocumentType,
  CreateDocumentConducteurInput,
  DocumentConducteur,
  UpdateDocumentConducteurInput,
} from '../../features/documents-conducteurs/types';
import { CONDUCTEUR_DOCUMENT_TYPE_LABELS } from '../../features/documents-conducteurs/types';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';

interface ConducteurDocumentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateDocumentConducteurInput | UpdateDocumentConducteurInput,
    file?: File,
  ) => Promise<void>;
  documentToEdit?: DocumentConducteur | null;
  initialIdConducteur?: number;
  isSubmitting?: boolean;
}

const FIXED_DOCUMENT_TYPES: ConducteurDocumentType[] = [
  'PASSEPORT',
  'VISA',
  'PERMIS_DE_CONDUIRE',
  'CARTE_DE_SANTE',
  'AUTRE',
];

export function ConducteurDocumentFormDialog({
  open,
  onClose,
  onSubmit,
  documentToEdit,
  initialIdConducteur,
  isSubmitting = false,
}: ConducteurDocumentFormDialogProps) {
  const isEdit = Boolean(documentToEdit);

  // Conducteurs list for select dropdown
  const { data: conducteursData, isLoading: isLoadingConducteurs } = useConducteursQuery({ limit: 100 });
  const conducteurs = conducteursData?.data ?? [];

  const [idConducteur, setIdConducteur] = useState<number>(0);
  const [selectedTypeCode, setSelectedTypeCode] = useState<ConducteurDocumentType>('PASSEPORT');
  const [customType, setCustomType] = useState('');
  const [numeroDocument, setNumeroDocument] = useState('');
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
        setIdConducteur(documentToEdit.idConducteur);
        setNumeroDocument(documentToEdit.numeroDocument || '');
        setDateEmission(documentToEdit.dateEmission || '');
        setDateExpiration(documentToEdit.dateExpiration || '');
        setNotes(documentToEdit.notes || '');

        const existingType = documentToEdit.typeDocument;
        if (FIXED_DOCUMENT_TYPES.includes(existingType as ConducteurDocumentType) && existingType !== 'AUTRE') {
          setSelectedTypeCode(existingType as ConducteurDocumentType);
          setCustomType('');
        } else {
          setSelectedTypeCode('AUTRE');
          setCustomType(existingType === 'AUTRE' ? '' : existingType);
        }
      } else {
        const defaultCondId = initialIdConducteur || (conducteurs[0]?.id ?? 0);
        setIdConducteur(defaultCondId);
        setSelectedTypeCode('PASSEPORT');
        setCustomType('');
        setNumeroDocument('');
        setDateEmission('');
        setDateExpiration('');
        setNotes('');
      }
    }
  }, [open, documentToEdit, initialIdConducteur, conducteurs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Le fichier dépasse la taille maximale autorisée de 5 Mo');
        return;
      }
      setErrorMsg(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isEdit && (!idConducteur || idConducteur <= 0)) {
      setErrorMsg('Veuillez sélectionner un conducteur');
      return;
    }

    let finalTypeDocument = selectedTypeCode as string;
    if (selectedTypeCode === 'AUTRE') {
      const trimmedCustom = customType.trim();
      if (!trimmedCustom) {
        setErrorMsg('Veuillez préciser le type de document pour « Autre »');
        return;
      }
      finalTypeDocument = trimmedCustom;
    }

    if (dateEmission && dateExpiration && new Date(dateExpiration) < new Date(dateEmission)) {
      setErrorMsg("La date d'expiration ne peut pas être antérieure à la date d'émission");
      return;
    }

    try {
      if (isEdit) {
        const updateData: UpdateDocumentConducteurInput = {
          typeDocument: finalTypeDocument,
          numeroDocument: numeroDocument.trim() || undefined,
          dateEmission: dateEmission || undefined,
          dateExpiration: dateExpiration || undefined,
          notes: notes.trim() || undefined,
        };
        await onSubmit(updateData, selectedFile || undefined);
      } else {
        const createData: CreateDocumentConducteurInput = {
          idConducteur,
          typeDocument: finalTypeDocument,
          numeroDocument: numeroDocument.trim() || undefined,
          dateEmission: dateEmission || undefined,
          dateExpiration: dateExpiration || undefined,
          notes: notes.trim() || undefined,
        };
        await onSubmit(createData, selectedFile || undefined);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erreur lors de l'enregistrement";
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle fontWeight={700}>
          {isEdit ? 'Modifier le document conducteur' : 'Ajouter un document conducteur'}
        </DialogTitle>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Conducteur */}
            <Grid item xs={12}>
              <FormControl fullWidth disabled={isEdit || isLoadingConducteurs} required>
                <InputLabel id="conducteur-select-label">Conducteur</InputLabel>
                <Select
                  labelId="conducteur-select-label"
                  value={idConducteur || ''}
                  label="Conducteur"
                  onChange={(e) => setIdConducteur(Number(e.target.value))}
                >
                  {conducteurs.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.nomConducteur} {c.telephone ? `(${c.telephone})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {!idConducteur && <FormHelperText error>Sélectionnez un conducteur</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Type de Document */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="type-doc-cond-label">Type de document</InputLabel>
                <Select
                  labelId="type-doc-cond-label"
                  value={selectedTypeCode}
                  label="Type de document"
                  onChange={(e) => setSelectedTypeCode(e.target.value as ConducteurDocumentType)}
                >
                  {FIXED_DOCUMENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {CONDUCTEUR_DOCUMENT_TYPE_LABELS[type] || type}
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
                placeholder="Ex: PASS-123456"
                value={numeroDocument}
                onChange={(e) => setNumeroDocument(e.target.value)}
              />
            </Grid>

            {/* Type personnalisé si "Autre" est sélectionné */}
            {selectedTypeCode === 'AUTRE' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Type de document personnalisé"
                  placeholder="Ex: Contrat de travail, Attestation de formation..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  helperText="Précisez le nom exact de ce document"
                />
              </Grid>
            )}

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
