import type { ReactNode } from 'react';
import { TableContainer, Paper, LinearProgress, Box } from '@mui/material';

export interface DataTableShellProps {
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyState?: ReactNode;
  pagination?: ReactNode;
  /**
   * Optional minimum width of the table in pixels to force horizontal scrolling
   * inside the table container on narrower viewports.
   */
  minWidth?: number;
  /**
   * Optional density mode targeting:
   * - 'dense': ~46px row height (cell padding 6px 12px)
   * - 'standard': ~48-50px row height (cell padding 8px 12px)
   * - 'complex': ~52-64px row height (cell padding 10px 12px)
   * Defaults to 'standard'.
   */
  density?: 'dense' | 'standard' | 'complex';
  /**
   * Optional sticky header flag. Enable ONLY when table is inside a bounded scroll container.
   */
  stickyHeader?: boolean;
  /**
   * Optional max height of the table container for bounded vertical scrolling.
   */
  maxHeight?: number | string;
}

export function DataTableShell({
  children,
  loading = false,
  empty = false,
  emptyState,
  pagination,
  minWidth = 650,
  density = 'standard',
  stickyHeader = false,
  maxHeight,
}: DataTableShellProps) {
  // Determine cell vertical padding based on density tier
  let cellPaddingVertical = '8px';
  if (density === 'dense') cellPaddingVertical = '6px';
  else if (density === 'complex') cellPaddingVertical = '10px';

  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: (theme) => `${theme.customRadii.medium}px`,
      }}
    >
      {/* Top linear progress bar during query loading states */}
      {loading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        />
      )}

      {/* Responsive table container allowing horizontal scrolling */}
      <TableContainer
        sx={{
          maxHeight: maxHeight || 'none',
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: minWidth,
          },
          '& .MuiTableCell-root': {
            padding: `${cellPaddingVertical} 12px`,
          },
          '& .MuiTableCell-head': {
            padding: '8px 12px',
            backgroundColor: '#F8FAFC',
            fontWeight: 600,
            fontSize: '0.8125rem',
            ...(stickyHeader && {
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }),
          },
        }}
      >
        {children}
      </TableContainer>

      {/* Empty State slot */}
      {empty && !loading && emptyState && (
        <Box sx={{ py: 6, width: '100%', display: 'flex', justifyContent: 'center' }}>
          {emptyState}
        </Box>
      )}

      {/* Pagination component footer */}
      {pagination && <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>{pagination}</Box>}
    </Paper>
  );
}

