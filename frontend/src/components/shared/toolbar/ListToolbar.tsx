import type { ReactNode } from 'react';
import { Box, Button, Grid, Stack } from '@mui/material';
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
      spacing={2}
      sx={{ mb: 2 }}
    >
      <Grid container spacing={2} alignItems="center">
        {/* Search Field wrapper */}
        {searchField && (
          <Grid item xs={12} sm={6} md={4}>
            {searchField}
          </Grid>
        )}

        {/* Custom Filters children */}
        {children && (
          <Grid item xs={12} sm={6} md={6}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {children}
            </Stack>
          </Grid>
        )}

        {/* Reset button */}
        {onResetFilters && (
          <Grid item xs={12} sm={12} md="auto">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={onResetFilters}
              disabled={resetDisabled}
              startIcon={<FilterAltOffIcon />}
              sx={{ minHeight: 38 }}
            >
              Réinitialiser
            </Button>
          </Grid>
        )}
      </Grid>

      {/* Action Button slot */}
      {action && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'stretch', md: 'flex-end' },
            minWidth: { md: 150 },
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
