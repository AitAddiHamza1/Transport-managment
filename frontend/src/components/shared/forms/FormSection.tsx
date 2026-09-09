import type { ReactNode } from 'react';
import { Paper, Box, Divider, Typography } from '@mui/material';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Visual variant: 'outlined' renders a standard Card surface; 'flat' renders inline without borders.
   * Defaults to 'outlined'.
   */
  variant?: 'outlined' | 'flat';
}

export function FormSection({
  title,
  description,
  children,
  variant = 'outlined',
}: FormSectionProps) {
  const isOutlined = variant === 'outlined';

  const content = (
    <Box sx={{ p: isOutlined ? 3 : 0 }}>
      {/* Title Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Grid Content wrapper */}
      <Box>{children}</Box>
    </Box>
  );

  if (isOutlined) {
    return (
      <Paper variant="outlined" sx={{ mb: 3, width: '100%' }}>
        {content}
      </Paper>
    );
  }

  return <Box sx={{ mb: 4, width: '100%' }}>{content}</Box>;
}
