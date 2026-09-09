import { Box, Container } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

export interface AppPageProps {
  children: ReactNode;
  /**
   * Custom max width constraint for the page workspace.
   * Defaults to false (full-width workspace) to accommodate dense ERP components.
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /**
   * Disables responsive padding around page content.
   */
  disablePadding?: boolean;
  sx?: SxProps<Theme>;
}

export function AppPage({
  children,
  maxWidth = false,
  disablePadding = false,
  sx,
}: AppPageProps) {
  // If a max width restriction is requested, wrap in MUI Container
  if (maxWidth) {
    return (
      <Container
        maxWidth={maxWidth}
        disableGutters={disablePadding}
        sx={{
          py: disablePadding ? 0 : { xs: 1, sm: 2 },
          pb: disablePadding ? 0 : 4,
          ...sx,
        }}
      >
        {children}
      </Container>
    );
  }

  // Full-width flex container
  return (
    <Box
      sx={{
        width: '100%',
        px: disablePadding ? 0 : { xs: 0, sm: 0.5 },
        pb: disablePadding ? 0 : 4,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
