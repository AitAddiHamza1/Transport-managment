import { Box, CircularProgress, Typography } from '@mui/material';

export interface FullScreenLoaderProps {
  label?: string;
}

export function FullScreenLoader({
  label = 'Chargement...',
}: FullScreenLoaderProps) {
  return (
    <Box
      sx={{
        height: ['100vh', '100dvh'], // Viewport dvh support with vh fallback
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: (theme) => theme.zIndex.modal + 100, // Make sure it covers drawers
      }}
    >
      <CircularProgress color="primary" />
      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );
}
