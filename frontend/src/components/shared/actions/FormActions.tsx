import { Button, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ResponsiveActions } from './ResponsiveActions';

export interface FormActionsProps {
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  extraActions?: ReactNode;
  sx?: SxProps<Theme>;
}

export function FormActions({
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  loading = false,
  disabled = false,
  extraActions,
  sx,
}: FormActionsProps) {
  return (
    <ResponsiveActions
      justifyContent="flex-end"
      stackOnMobile={true}
      fullWidthOnMobile={true}
      sx={{ mt: 3, ...sx }}
    >
      {extraActions}

      <Button
        variant="outlined"
        color="inherit"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelLabel}
      </Button>

      <Button
        variant="contained"
        color="primary"
        onClick={onSubmit}
        disabled={loading || disabled}
        startIcon={
          loading ? (
            <CircularProgress size={16} color="inherit" />
          ) : undefined
        }
      >
        {submitLabel}
      </Button>
    </ResponsiveActions>
  );
}
