import React from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VerifiedIcon from '@mui/icons-material/Verified';

interface PdfStampDialogProps {
  open: boolean;
  invoiceNumber: string | null;
  onClose: () => void;
  onDownload: (includeStamp: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PdfStampDialog({
  open,
  invoiceNumber,
  onClose,
  onDownload,
  isLoading = false,
  error = null,
}: PdfStampDialogProps) {
  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight="bold">
        Télécharger la facture N° {invoiceNumber}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Souhaitez-vous inclure le cachet / la signature numérique de l'entreprise sur ce document PDF ?
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Note : L'absence ou la présence du cachet n'altère pas les montants légaux de la facture.
        </Typography>

        {isLoading && (
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Génération du PDF en cours…
            </Typography>
          </Stack>
        )}

        {error && !isLoading && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} width="100%" justifyContent="flex-end">
          <Button
            variant="outlined"
            color="inherit"
            onClick={isLoading ? undefined : onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            id="pdf-no-stamp-btn"
            variant="outlined"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => onDownload(false)}
            disabled={isLoading}
          >
            Sans cachet
          </Button>
          <Button
            id="pdf-with-stamp-btn"
            variant="contained"
            color="primary"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <VerifiedIcon />}
            onClick={() => onDownload(true)}
            disabled={isLoading}
          >
            Avec cachet
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
