import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export interface FormGridProps {
  children: ReactNode;
  /**
   * Maximum column grid span at wider breakpoints.
   * Defaults to 2 columns.
   */
  columns?: 1 | 2 | 3;
  /**
   * Grid item spacing factor. Defaults to 2 (16px).
   */
  gap?: number;
  sx?: SxProps<Theme>;
}

export function FormGrid({
  children,
  columns = 2,
  gap = 2,
  sx,
}: FormGridProps) {
  // Determine grid column sizing dynamically based on requested limits
  const getColSpan = () => {
    if (columns === 1) {
      return { xs: 12 };
    }
    if (columns === 2) {
      return { xs: 12, sm: 6 };
    }
    // 3 columns layout
    return { xs: 12, sm: 6, md: 4 };
  };

  const colSpan = getColSpan();

  return (
    <Grid container spacing={gap} sx={sx}>
      {/* Recursively map children to Grid items with responsive columns mapping */}
      {Array.isArray(children) ? (
        children.map((child, index) => {
          if (!child) return null;
          return (
            <Grid item {...colSpan} key={index}>
              {child}
            </Grid>
          );
        })
      ) : (
        <Grid item xs={12}>
          {children}
        </Grid>
      )}
    </Grid>
  );
}
