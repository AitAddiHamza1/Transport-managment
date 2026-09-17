import type { ReactNode } from 'react';
import { Box, Button, Stack } from '@mui/material';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';

export interface ListToolbarProps {
  /**
   * SearchField slot
   */
  searchField?: ReactNode;
  /**
   * Custom filter elements injected by the caller
   */
  children?: ReactNode;
  /**
   * Reset filters callback
   */
  onResetFilters?: () => void;
  resetDisabled?: boolean;
  /**
   * Right-side actions (e.g. "Add" buttons)
   */
  action?: ReactNode;
}

export function ListToolbar({
  searchField,
  children,
  onResetFilters,
  resetDisabled = false,
  action,
}: ListToolbarProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'center' }}
      spacing={1.5}
      sx={{ mb: 1.5 }}
    >
      {/* Search & Filters Left/Center Container */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1.5,
          flex: '1 1 auto',
          minWidth: 0,
        }}
      >
        {/* Search Field slot with comfortable flex and max width */}
        {searchField && (
          <Box
            sx={{
              flex: { xs: '1 1 100%', sm: '1 1 240px', md: '0 1 280px' },
              minWidth: { sm: 220 },
              maxWidth: { md: 340 },
            }}
          >
            {searchField}
          </Box>
        )}

        {/* Custom Filters + Attached Reset Button */}
        {(children || onResetFilters) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
            {children}

            {onResetFilters && (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={onResetFilters}
                disabled={resetDisabled}
                startIcon={<FilterAltOffIcon />}
                sx={{
                  minHeight: 38,
                  fontSize: '0.8125rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Réinitialiser
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Action Button slot */}
      {action && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'stretch', md: 'flex-end' },
            flexShrink: 0,
            '& > button, & > a': {
              width: { xs: '100%', md: 'auto' },
            },
          }}
        >
          {action}
        </Box>
      )}
    </Stack>
  );
}


