import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';

export interface MobileCardListProps {
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  footer?: ReactNode;
}

export function MobileCardList({
  children,
  loading = false,
  empty = false,
  loadingState,
  emptyState,
  footer,
}: MobileCardListProps) {
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {/* Loading state indicator */}
      {loading && loadingState && <Box>{loadingState}</Box>}

      {/* Empty State slot */}
      {empty && !loading && emptyState && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>{emptyState}</Box>
      )}

      {/* Renders list children */}
      {!loading && !empty && <Box>{children}</Box>}

      {/* Pagination or load footer */}
      {footer && <Box sx={{ mt: 2 }}>{footer}</Box>}
    </Stack>
  );
}
