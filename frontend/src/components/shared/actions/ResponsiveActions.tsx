import { Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

export interface ResponsiveActionsProps {
  children: ReactNode;
  /**
   * Whether to wrap buttons if they overflow.
   * Defaults to true.
   */
  wrap?: boolean;
  /**
   * Forces buttons to stack vertically on xs screens (mobile).
   * Defaults to true.
   */
  stackOnMobile?: boolean;
  /**
   * If true, stretches every child button to 100% width on xs screens (mobile).
   * Defaults to false.
   */
  fullWidthOnMobile?: boolean;
  /**
   * Alignment of items. Defaults to 'flex-start'.
   */
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  sx?: SxProps<Theme>;
}

export function ResponsiveActions({
  children,
  wrap = true,
  stackOnMobile = true,
  fullWidthOnMobile = false,
  justifyContent = 'flex-start',
  sx,
}: ResponsiveActionsProps) {
  return (
    <Stack
      direction={{
        xs: stackOnMobile ? 'column' : 'row',
        sm: 'row',
      }}
      spacing={1.5}
      justifyContent={justifyContent}
      alignItems={{
        xs: stackOnMobile && fullWidthOnMobile ? 'stretch' : 'center',
        sm: 'center',
      }}
      sx={{
        flexWrap: wrap ? 'wrap' : 'nowrap',
        width: fullWidthOnMobile ? '100%' : 'auto',
        // Make sure buttons inside stretch on mobile when requested
        '& > button, & > a, & > div': {
          width: {
            xs: stackOnMobile && fullWidthOnMobile ? '100%' : 'auto',
            sm: 'auto',
          },
        },
        ...sx,
      }}
    >
      {children}
    </Stack>
  );
}
