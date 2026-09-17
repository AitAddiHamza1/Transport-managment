import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
} from '@mui/material';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Tone of the confirmation action.
   * Defaults to 'error' (typical for delete actions).
   */
  severity?: 'error' | 'warning' | 'info' | 'success';
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  severity = 'error',
  loading = false,
  disabled = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  // Determine confirm button color tone mapping safely
  let btnColor: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' = 'primary';
  if (severity === 'error') btnColor = 'error';
  else if (severity === 'warning') btnColor = 'warning';
  else if (severity === 'success') btnColor = 'success';
  else if (severity === 'info') btnColor = 'info';

  const handleClose = (_event: object, _reason: 'backdropClick' | 'escapeKeyDown') => {
    // Prevent close callbacks through backdrop or Escape key ONLY when loading is active
    if (loading) {
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      // Prevent Escape closing while loading
      disableEscapeKeyDown={loading}
      PaperProps={{
        sx: {
          borderRadius: (theme) => `${theme.customRadii.large}px`,
        },
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{ px: 2.5, py: 2, fontSize: '1.0625rem', fontWeight: 600 }}>
        {title}
      </DialogTitle>
      
      <DialogContent sx={{ px: 2.5, py: 1.5 }}>
        <DialogContentText component="div" id="confirm-dialog-description" sx={{ fontSize: '0.875rem' }}>
          {description}
        </DialogContentText>
      </DialogContent>
      
      <DialogActions sx={{ px: 2.5, py: 2 }}>
        <Button onClick={onClose} disabled={loading} size="small" sx={{ fontSize: '0.8125rem' }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={btnColor}
          variant="contained"
          size="small"
          disabled={loading || disabled}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
          autoFocus
          sx={{ fontSize: '0.8125rem' }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

