import type { ReactNode } from 'react';
import { Card, CardContent, Divider, Box } from '@mui/material';
import { SectionHeader } from '../page/SectionHeader';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /**
   * Content padding spacing factor. Defaults to 3 (24px).
   */
  padding?: number;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  padding = 3,
}: SectionCardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <Card variant="outlined" sx={{ mb: 3, width: '100%' }}>
      {hasHeader && title && (
        <Box sx={{ px: padding, pt: padding, pb: 1.5 }}>
          <SectionHeader
            title={title}
            description={subtitle}
            action={action}
          />
          <Divider sx={{ mt: 1.5 }} />
        </Box>
      )}
      
      <CardContent sx={{ p: `${padding}px !important` }}>
        {children}
      </CardContent>
    </Card>
  );
}
