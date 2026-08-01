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
}

export function DataTableShell({
  children,
  loading = false,
  empty = false,
  emptyState,
  pagination,
  minWidth = 650,
}: DataTableShellProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
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
          maxHeight: 'none',
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: minWidth,
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
