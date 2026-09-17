import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ChequeView } from '../../features/cheques/types';
import {
  useChequeDocumentMetadata,
  useRemoveChequeDocument,
  useUploadChequeDocument,
} from '../../features/cheques/useCheques';
import { chequesApi } from '../../features/cheques/chequesApi';
import { Can } from '../shared/Can';
import { ConfirmDialog } from '../shared/dialogs/ConfirmDialog';
import { notify } from '../../utils/notify';

interface ChequeDetailSectionProps {
  cheque: ChequeView;
}

export const ChequeDetailSection: React.FC<ChequeDetailSectionProps> = ({ cheque }) => {
  const { data: documentMeta, isLoading: isLoadingMeta } = useChequeDocumentMetadata(
    cheque?.id,
  );

  const uploadDocMutation = useUploadChequeDocument();
  const deleteDocMutation = useRemoveChequeDocument();

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !cheque?.id) return;
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      notify.error(`Fichier "${file.name}" rejeté. Formats acceptés : PDF, JPEG, PNG, WEBP`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(`Fichier "${file.name}" trop volumineux (max 5 Mo)`);
      return;
    }

    try {
      await uploadDocMutation.mutateAsync({ chequeId: cheque.id, file });
    } catch (_) {}
  };

  const handleDeleteConfirm = async () => {
    if (!cheque?.id) return;
    try {
      await deleteDocMutation.mutateAsync(cheque.id);
      setIsConfirmDeleteOpen(false);
    } catch (_) {}
  };

  const handleDownloadDoc = async () => {
    if (!cheque?.id) return;
    try {
      await chequesApi.downloadDocument(
        cheque.id,
        documentMeta?.nomOriginal || `cheque-${cheque.id}`,
      );
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    }
  };

  const handleViewDoc = async () => {
    if (!cheque?.id) return;
    try {
      const blobUrl = await chequesApi.viewDocumentFile(cheque.id);
      window.open(blobUrl, '_blank');
    } catch (_) {
      notify.error("Erreur lors de l'ouverture du document");
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'primary.light' }}>
      <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
        Informations — Chèque
      </Typography>

      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            N° du chèque
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.numero}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Série
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.serie || '—'}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Date du chèque
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.dateCheque}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Banque
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.banque}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Agence
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.agence || '—'}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Bénéficiaire
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.beneficiaire}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Ville
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {cheque.ville || '—'}
          </Typography>
        </Grid>

        {/* Document Section */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Document du chèque
          </Typography>

          {isLoadingMeta ? (
            <CircularProgress size={20} />
          ) : documentMeta ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: 'primary.light',
                borderRadius: 1.5,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <AttachFileIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {documentMeta.nomOriginal || 'Scan du chèque'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {documentMeta.mimeType} •{' '}
                    {documentMeta.tailleFichier
                      ? `${(documentMeta.tailleFichier / 1024).toFixed(0)} Ko`
                      : ''}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={0.5}>
                <Can module="gestion_paiements" action="voir">
                  <IconButton size="small" title="Visualiser" onClick={handleViewDoc}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Can>

                <Can module="gestion_paiements" action="voir">
                  <IconButton size="small" title="Télécharger" onClick={handleDownloadDoc}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Can>

                <Can module="gestion_paiements" action="modifier">
                  <IconButton
                    size="small"
                    color="error"
                    title="Supprimer"
                    onClick={() => setIsConfirmDeleteOpen(true)}
                    disabled={deleteDocMutation.isPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Can>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Aucun document associé
              </Typography>
              <Can module="gestion_paiements" action="modifier">
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={
                    uploadDocMutation.isPending ? (
                      <CircularProgress size={16} />
                    ) : (
                      <CloudUploadIcon />
                    )
                  }
                  disabled={uploadDocMutation.isPending || !cheque?.id}
                >
                  Ajouter un document
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpeg,.jpg,.png,.webp"
                    onChange={handleFileUpload}
                  />
                </Button>
              </Can>
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        title="Supprimer le document du chèque"
        description="Voulez-vous vraiment supprimer le document du chèque ?"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        loading={deleteDocMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </Paper>
  );
};
