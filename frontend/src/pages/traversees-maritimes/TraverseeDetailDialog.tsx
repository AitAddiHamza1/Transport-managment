import { useState } from 'react';
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
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import type { TraverseeMaritime } from '../../features/traversees-maritimes/types';
import { traverseesApi } from '../../features/traversees-maritimes/traverseesApi';
import { notify } from '../../utils/notify';
import {
  useDeleteJustificatifMutation,
  useUploadJustificatifMutation,
} from '../../features/traversees-maritimes/useTraversees';

interface TraverseeDetailDialogProps {
  open: boolean;
  traversee: TraverseeMaritime | null;
  onClose: () => void;
  onToggleVerification?: (item: TraverseeMaritime) => void;
  canEdit: boolean;
}

export function TraverseeDetailDialog({
  open,
  traversee,
  onClose,
  onToggleVerification,
  canEdit,
}: TraverseeDetailDialogProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const uploadJustificatifMutation = useUploadJustificatifMutation();
  const deleteJustificatifMutation = useDeleteJustificatifMutation();

  if (!traversee) return null;

  const handlePreview = async () => {
    try {
      setIsPreviewing(true);
      const fileUrl = await traverseesApi.previewJustificatif(traversee.id);
      window.open(fileUrl, '_blank');
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Erreur lors de l’ouverture du justificatif');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await traverseesApi.downloadJustificatif(traversee.id, traversee.nomOriginal || undefined);
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Erreur lors du téléchargement du justificatif');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      notify.error('Format de fichier rejeté (PDF, JPG, PNG uniquement)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error('Fichier trop volumineux (max 5 Mo)');
      return;
    }

    await uploadJustificatifMutation.mutateAsync({ id: traversee.id, file });
  };

  const handleDeleteFile = async () => {
    if (window.confirm('Voulez-vous vraiment supprimer ce justificatif de traversée ?')) {
      await deleteJustificatifMutation.mutateAsync(traversee.id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <DirectionsBoatIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Détails de la traversée maritime #{traversee.id}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Main info card */}
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                Informations Traversée
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Statut de vérification
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {traversee.estVerifiee ? (
                      <Chip
                        icon={<TaskAltIcon />}
                        label="Vérifiée (Payée / Conforme)"
                        color="success"
                        size="small"
                        onClick={() => canEdit && onToggleVerification?.(traversee)}
                      />
                    ) : (
                      <Chip
                        icon={<RadioButtonUncheckedIcon />}
                        label="Non vérifiée"
                        variant="outlined"
                        color="default"
                        size="small"
                        onClick={() => canEdit && onToggleVerification?.(traversee)}
                      />
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Bateau
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {traversee.bateau}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Lieu d'embarquement
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={traversee.lieuEmbarquement} color="primary" size="small" />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date de traversée
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {traversee.dateTraversee}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Prix
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {traversee.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Logistics & Relation info */}
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                Attribution & Voyage
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Véhicule
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {traversee.immatriculation}{' '}
                    {traversee.vehicule?.marque ? `(${traversee.vehicule.marque})` : ''}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Conducteur
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {traversee.conducteur?.nomConducteur || 'Chauffeur non renseigné'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Voyage associé
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {traversee.idVoyage ? (
                      <Chip
                        label={`Voyage #V-00${traversee.idVoyage}`}
                        color="info"
                        size="small"
                      />
                    ) : (
                      <Chip label="Sans voyage (Traversée à vide)" variant="outlined" color="secondary" size="small" />
                    )}
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Justificatif de traversée section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Justificatif de traversée
              </Typography>

              {traversee.cheminFichier ? (
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {traversee.nomOriginal}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {traversee.tailleFichier ? `${(traversee.tailleFichier / 1024).toFixed(0)} Ko` : ''} •{' '}
                      {traversee.mimeType}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={isPreviewing ? <CircularProgress size={16} /> : <VisibilityIcon />}
                      onClick={handlePreview}
                      disabled={isPreviewing}
                    >
                      Aperçu
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                      onClick={handleDownload}
                      disabled={isDownloading}
                    >
                      Télécharger
                    </Button>
                    {canEdit && (
                      <IconButton color="error" size="small" onClick={handleDeleteFile}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
              ) : (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucun justificatif téléversé
                  </Typography>
                  {canEdit && (
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      startIcon={
                        uploadJustificatifMutation.isPending ? (
                          <CircularProgress size={16} />
                        ) : (
                          <CloudUploadIcon />
                        )
                      }
                      disabled={uploadJustificatifMutation.isPending}
                    >
                      Ajouter un justificatif (PDF, JPG, PNG)
                      <input type="file" hidden accept=".pdf,.jpeg,.jpg,.png" onChange={handleFileChange} />
                    </Button>
                  )}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
