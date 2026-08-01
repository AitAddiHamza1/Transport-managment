import { Alert, AlertTitle, Button, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <Box
      sx={{
        width: '100%',
        py: compact ? 1 : 2,
      }}
    >
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<RefreshIcon />}
            >
              Réessayer
            </Button>
          ) : undefined
        }
        sx={{
          borderRadius: (theme) => `${theme.customRadii.small}px`,
          alignItems: 'center',
        }}
      >
        {!compact && title && <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>}
        {message}
      </Alert>
    </Box>
  );
}
