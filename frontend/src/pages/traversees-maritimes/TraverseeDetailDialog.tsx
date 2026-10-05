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
import RouteIcon from '@mui/icons-material/Route';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import type { TraverseeMaritime } from '../../features/traversees-maritimes/types';
import { traverseesApi } from '../../features/traversees-maritimes/traverseesApi';
import { notify } from '../../utils/notify';
import { formatDisplayDate } from '../../utils/formatDate';
import {
  useDeleteJustificatifMutation,
  useUploadJustificatifMutation,
} from '../../features/traversees-maritimes/useTraversees';

interface TraverseeDetailDialogProps {
  open: boolean;
  traversee: TraverseeMaritime | null;
  onClose: () => void;
  onToggleVerification?: (item: TraverseeMaritime, section: 'circuit' | 'bateau' | 'transit') => void;
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
    if (window.confirm('Voulez-vous vraiment supprimer ce justificatif ?')) {
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
              Détails de l'opération Tanger Med #{traversee.id}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* General Info / Attribution & Voyage */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                Informations Générales
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Date de l'opération</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDisplayDate(traversee.dateOperation || traversee.dateTraversee)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Véhicule</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {traversee.immatriculation || 'Non renseigné'}{' '}
                    {traversee.vehicule?.marque ? `(${traversee.vehicule.marque})` : ''}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Conducteur</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {traversee.conducteur?.nomConducteur || 'Non renseigné'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Voyage associé</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {traversee.idVoyage ? (
                      <Chip label={`Voyage #V-00${traversee.idVoyage}`} color="info" size="small" />
                    ) : (
                      <Chip label="Sans voyage" variant="outlined" color="secondary" size="small" />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Section 1: Circuit Portuaire */}
          {traversee.hasCircuitPortuaire && (
            <Grid item xs={12} md={traversee.hasBateau && traversee.hasTransitAljaziras ? 4 : 6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <RouteIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Circuit portuaire
                    </Typography>
                  </Stack>
                  <Chip
                    icon={traversee.circuitEstVerifie ? <TaskAltIcon /> : <RadioButtonUncheckedIcon />}
                    label={traversee.circuitEstVerifie ? 'Vérifié' : 'Non vérifié'}
                    size="small"
                    color={traversee.circuitEstVerifie ? 'success' : 'default'}
                    variant={traversee.circuitEstVerifie ? 'filled' : 'outlined'}
                    onClick={() => canEdit && onToggleVerification?.(traversee, 'circuit')}
                    sx={{ cursor: canEdit ? 'pointer' : 'default' }}
                  />
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Nature du service</Typography>
                    <Typography variant="body2" fontWeight={600}>{traversee.circuitNature || 'Circuit portuaire'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Montant</Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">
                      {traversee.circuitMontant != null
                        ? `${traversee.circuitMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                        : 'Non renseigné'}
                    </Typography>
                  </Box>
                  {traversee.circuitNotes && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Notes</Typography>
                      <Typography variant="body2" color="text.secondary">{traversee.circuitNotes}</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          )}

          {/* Section 2: Bateau */}
          {traversee.hasBateau && (
            <Grid item xs={12} md={traversee.hasCircuitPortuaire && traversee.hasTransitAljaziras ? 4 : 6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <DirectionsBoatIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Bateau
                    </Typography>
                  </Stack>
                  <Chip
                    icon={traversee.estVerifiee ? <TaskAltIcon /> : <RadioButtonUncheckedIcon />}
                    label={traversee.estVerifiee ? 'Vérifié' : 'Non vérifié'}
                    size="small"
                    color={traversee.estVerifiee ? 'success' : 'default'}
                    variant={traversee.estVerifiee ? 'filled' : 'outlined'}
                    onClick={() => canEdit && onToggleVerification?.(traversee, 'bateau')}
                    sx={{ cursor: canEdit ? 'pointer' : 'default' }}
                  />
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Bateau / Société</Typography>
                    <Typography variant="body2" fontWeight={600}>{traversee.bateau || 'Non renseigné'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Lieu d'embarquement</Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <Chip label={traversee.lieuEmbarquement || 'Port'} color="primary" size="small" variant="outlined" />
                    </Box>
                  </Box>
                  {traversee.dateTraversee && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Date de traversée</Typography>
                      <Typography variant="body2">{formatDisplayDate(traversee.dateTraversee)}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Prix Bateau</Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">
                      {traversee.prix != null
                        ? `${traversee.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                        : 'Non renseigné'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          )}

          {/* Section 3: Transit Aljaziras */}
          {traversee.hasTransitAljaziras && (
            <Grid item xs={12} md={traversee.hasCircuitPortuaire && traversee.hasBateau ? 4 : 6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AltRouteIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Transit Aljaziras
                    </Typography>
                  </Stack>
                  <Chip
                    icon={traversee.transitEstVerifie ? <TaskAltIcon /> : <RadioButtonUncheckedIcon />}
                    label={traversee.transitEstVerifie ? 'Vérifié' : 'Non vérifié'}
                    size="small"
                    color={traversee.transitEstVerifie ? 'success' : 'default'}
                    variant={traversee.transitEstVerifie ? 'filled' : 'outlined'}
                    onClick={() => canEdit && onToggleVerification?.(traversee, 'transit')}
                    sx={{ cursor: canEdit ? 'pointer' : 'default' }}
                  />
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Type de service</Typography>
                    <Typography variant="body2" fontWeight={600}>{traversee.transitTypeService || 'Transit'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Prix Transit</Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">
                      {traversee.transitPrix != null
                        ? `${traversee.transitPrix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                        : 'Non renseigné'}
                    </Typography>
                  </Box>
                  {traversee.transitNotes && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Notes</Typography>
                      <Typography variant="body2" color="text.secondary">{traversee.transitNotes}</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          )}

          {/* Justificatif document section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Justificatif / Fichier joint
              </Typography>

              {traversee.cheminFichier ? (
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} flexWrap="wrap">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {traversee.nomOriginal || 'Document joint'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {traversee.tailleFichier ? `${(traversee.tailleFichier / 1024).toFixed(0)} Ko` : ''}{' '}
                      {traversee.mimeType ? `• ${traversee.mimeType}` : ''}
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
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

