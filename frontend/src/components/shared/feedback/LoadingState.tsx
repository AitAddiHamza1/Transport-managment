import { Box, CircularProgress, Typography } from '@mui/material';

export interface LoadingStateProps {
  /**
   * Optional loading description text.
   */
  message?: string;
  /**
   * If true, restricts dimensions and margins to fit inside tight cards or dialogs.
   * Defaults to false.
   */
  compact?: boolean;
}

export function LoadingState({
  message = 'Chargement...',
  compact = false,
}: LoadingStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: compact ? 2 : 6,
        width: '100%',
        minHeight: compact ? 'none' : 180,
      }}
    >
      <CircularProgress size={compact ? 24 : 40} color="primary" />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
