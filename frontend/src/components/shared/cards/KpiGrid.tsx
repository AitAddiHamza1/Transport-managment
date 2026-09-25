import { Box, BoxProps } from '@mui/material';
import type { ReactNode } from 'react';

export interface KpiGridProps extends BoxProps {
  children: ReactNode;
  /**
   * Number of columns on desktop view (md and up).
   * Defaults to 4 columns.
   */
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number };
}

/**
 * Reusable KpiGrid container that ensures all KPI / summary cards in the row
 * have identical width and height within each page.
 */
export function KpiGrid({ children, columns = 4, sx, ...props }: KpiGridProps) {
  const colsObj = typeof columns === 'number' ? { xs: 2, sm: 2, md: columns } : columns;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${colsObj.xs ?? 2}, 1fr)`,
          sm: `repeat(${colsObj.sm ?? 2}, 1fr)`,
          md: `repeat(${colsObj.md ?? 4}, 1fr)`,
          ...(colsObj.lg ? { lg: `repeat(${colsObj.lg}, 1fr)` } : {}),
        },
        gap: 1.5,
        alignItems: 'stretch',
        mb: 2,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
