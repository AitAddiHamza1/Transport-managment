import {
  Alert,
  Box,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { useState, ChangeEvent } from 'react';
import { Employe } from '../../features/employes/types';
import {
  useEmployeDocumentsQuery,
  useUploadEmployeDocument,
  useDeleteEmployeDocument,
} from '../../features/employes/useEmployes';
import { employesApi } from '../../features/employes/employesApi';

const DOCUMENT_TYPES = [
  'CIN (Carte d’Identité Nationale)',
  'Contrat de travail',
  'Attestation CNSS',
  'Diplôme / Certification',
  'Permis de conduire / FIMO',
  'Attestation de travail',
  'Autre document RH',
];

interface EmployeDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  employe: Employe | null;
}

export function EmployeDocumentDialog({ open, onClose, employe }: EmployeDocumentDialogProps) {
  const employeId = employe ? employe.id : null;
  const { data: documents = [], isLoading } = useEmployeDocumentsQuery(employeId);

  // Upload form state
  const [typeDocument, setTypeDocument] = useState(DOCUMENT_TYPES[0]);
  const [numeroDocument, setNumeroDocument] = useState('');
  const [dateEmission, setDateEmission] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploadMutation = useUploadEmployeDocument();
  const deleteMutation = useDeleteEmployeDocument();

  if (!open || !employe) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('La taille du fichier ne doit pas dépasser 5 Mo');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Veuillez sélectionner un fichier à téléverser');
      return;
    }
    setErrorMsg(null);

    try {
      await uploadMutation.mutateAsync({
        id: employe.id,
        data: {
          typeDocument,
          numeroDocument: numeroDocument.trim() || undefined,
          dateEmission: dateEmission || undefined,
          dateExpiration: dateExpiration || undefined,
          notes: notes.trim() || undefined,
          file: selectedFile,
        },
      });

      // Reset upload form fields
      setNumeroDocument('');
      setDateEmission('');
      setDateExpiration('');
      setNotes('');
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors du téléversement du document');
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await deleteMutation.mutateAsync({ id: employe.id, docId });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Échec de la suppression du document');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Documents RH — {employe.prenom} {employe.nom} ({employe.matricule})
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

          {/* Upload Form Box */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>
              Ajouter un document RH
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Type de document *"
                  fullWidth
                  size="small"
                  value={typeDocument}
                  onChange={(e) => setTypeDocument(e.target.value)}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="N° Document / Référence"
                  fullWidth
                  size="small"
                  value={numeroDocument}
                  onChange={(e) => setNumeroDocument(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d’émission"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={dateEmission}
                  onChange={(e) => setDateEmission(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d’expiration"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={dateExpiration}
                  onChange={(e) => setDateExpiration(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  label="Notes / Remarques"
                  fullWidth
                  size="small"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  component="label"
                  startIcon={<DescriptionIcon />}
                  sx={{ height: 40 }}
                >
                  {selectedFile ? selectedFile.name.slice(0, 15) + '...' : 'Choisir fichier'}
                  <input
                    type="file"
                    hidden
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                  />
                </Button>
              </Grid>

              <Grid item xs={12} sx={{ textAlign: 'right' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    uploadMutation.isPending ? <CircularProgress size={18} /> : <UploadFileIcon />
                  }
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                >
                  Téléverser le document
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Divider />

          {/* Document Table */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Documents enregistrés ({documents.length})
            </Typography>

            {isLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                Aucun document enregistré pour cet employé.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fichier d’origine</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>N° / Expiration</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Taille</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {doc.typeDocument}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 150 }}>
                            {doc.originalName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {doc.numeroDocument && (
                            <Typography variant="caption" display="block">
                              N°: {doc.numeroDocument}
                            </Typography>
                          )}
                          {doc.dateExpiration && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Exp: {doc.dateExpiration}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {(doc.fileSize / 1024).toFixed(1)} Base KB
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Consulter le fichier">
                            <IconButton
                              size="small"
                              color="primary"
                              component="a"
                              href={employesApi.getDocumentFileUrl(employe.id, doc.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
