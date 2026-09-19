import { useState } from 'react';
import {
  Avatar,
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
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { DocumentVehicule } from '../../features/documents-vehicules/types';
import { DOCUMENT_TYPE_LABELS } from '../../features/documents-vehicules/types';
import { documentsVehiculesApi } from '../../features/documents-vehicules/documentsVehiculesApi';
import { notify } from '../../utils/notify';

interface VehicleDocumentDetailDialogProps {
  open: boolean;
  onClose: () => void;
  document: DocumentVehicule | null;
}

export function VehicleDocumentDetailDialog({
  open,
  onClose,
  document,
}: VehicleDocumentDetailDialogProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!document) return null;

  const getStatusChip = () => {
    if (!document.hasExpirationDate) {
      return <Chip label="Valide — sans date d'expiration" color="success" size="small" />;
    }
    if (document.status === 'EXPIRE') {
      return (
        <Chip
          label={`Expiré (${Math.abs(document.daysUntilExpiry ?? 0)} j)`}
          color="error"
          size="small"
        />
      );
    }
    if (document.status === 'BIENTOT_EXPIRE') {
      return (
        <Chip
          label={`Expiration proche (${document.daysUntilExpiry} j)`}
          color="warning"
          size="small"
        />
      );
    }
    return <Chip label={`Valide (${document.daysUntilExpiry} j)`} color="success" size="small" />;
  };

  const handlePreview = async () => {
    const previewWindow = window.open('', '_blank');
    setIsPreviewing(true);
    try {
      const blobUrl = await documentsVehiculesApi.previewFile(document.idDocument);
      if (previewWindow) {
        previewWindow.location.href = blobUrl;
      } else {
        notify.error("Le navigateur a bloqué l'ouverture de la fenêtre d'aperçu");
      }
    } catch (_) {
      previewWindow?.close();
      notify.error("Erreur lors de l'ouverture de l'aperçu du document");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await documentsVehiculesApi.downloadFile(
        document.idDocument,
        document.originalFileName || undefined,
      );
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
              <DescriptionIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {DOCUMENT_TYPE_LABELS[document.typeDocument] || document.typeDocument}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Réf: {document.numeroDocument || 'Sans numéro'}
              </Typography>
            </Box>
          </Stack>
          {getStatusChip()}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Information Véhicule */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <DirectionsBusIcon color="action" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Véhicule : {document.vehicle.immatriculation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {document.vehicle.marque} {document.vehicle.modele || ''} ({document.vehicle.typeVehicule})
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Propriétés du Document */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Type de document
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {DOCUMENT_TYPE_LABELS[document.typeDocument]}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Numéro de document
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {document.numeroDocument || '—'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Organisme émetteur
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {document.organismeEmetteur || '—'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Statut de validité
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getStatusChip()}</Box>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Date d'émission
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="body2">{document.dateEmission || '—'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Date d'expiration
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>
                  {document.dateExpiration || 'Sans expiration'}
                </Typography>
              </Stack>
            </Grid>

            {document.notes && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Notes & Remarques
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                  {document.notes}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Divider />

          {/* Section Fichier Joint */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Fichier numérisé
            </Typography>
            {document.hasFile ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {document.originalFileName || 'Document numérisé'}
                    </Typography>
                    {document.fileSize && (
                      <Typography variant="caption" color="text.secondary">
                        {(document.fileSize / 1024).toFixed(1)} Ko • {document.mimeType || 'Fichier'}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={isPreviewing ? <CircularProgress size={16} /> : <VisibilityIcon />}
                      onClick={handlePreview}
                      disabled={isPreviewing || isDownloading}
                    >
                      Aperçu
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={isDownloading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
                      onClick={handleDownload}
                      disabled={isPreviewing || isDownloading}
                    >
                      Télécharger
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Aucun fichier numérisé n'est joint à ce document.
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
