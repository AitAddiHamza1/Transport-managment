import { Box, Container, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

/** Layout centré pour les écrans publics (login). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #3d5a80 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/favicon.svg"
              alt="Transivo"
              sx={{
                height: 56,
                width: 'auto',
                objectFit: 'contain',
                display: 'inline-block',
                mb: 1.5,
              }}
            />
            <Typography
              variant="h5"
              component="h1"
              color="primary.main"
              sx={{ fontWeight: 800, letterSpacing: '0.06em' }}
            >
              TRANSIVO
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Espace de gestion
            </Typography>
          </Box>
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
