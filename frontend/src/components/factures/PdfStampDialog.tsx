import React from 'react';
import {
  Button,
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
}

export function PdfStampDialog({
  open,
  invoiceNumber,
  onClose,
  onDownload,
}: PdfStampDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight="bold">
        Télécharger la facture N° {invoiceNumber}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Souhaitez-vous inclure le cachet / la signature numérique de l’entreprise sur ce document PDF ?
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Note : L’absence ou la présence du cachet n’altère pas les montants légaux de la facture.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} width="100%" justifyContent="flex-end">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => onDownload(false)}
          >
            Sans cachet
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<VerifiedIcon />}
            onClick={() => onDownload(true)}
          >
            Avec cachet
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
