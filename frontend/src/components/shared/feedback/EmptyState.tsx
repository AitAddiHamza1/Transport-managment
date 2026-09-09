import type { ReactNode } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /**
   * Compact sizing option for usage inside dashboard cards or panels.
   */
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon = <InfoOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: compact ? 2 : 4,
        width: '100%',
        minHeight: compact ? 'none' : 200,
      }}
    >
      {icon && <Box sx={{ mb: 1.5 }}>{icon}</Box>}
      <Typography
        variant={compact ? 'subtitle2' : 'h6'}
        sx={{ fontWeight: 600, color: 'text.primary' }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, maxWidth: 400, mx: 'auto' }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          {action}
        </Stack>
      )}
    </Box>
  );
}
