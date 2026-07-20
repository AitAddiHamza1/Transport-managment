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
  description: string;
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
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {description}
        </DialogContentText>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={btnColor}
          variant="contained"
          disabled={loading || disabled}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
          autoFocus
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
