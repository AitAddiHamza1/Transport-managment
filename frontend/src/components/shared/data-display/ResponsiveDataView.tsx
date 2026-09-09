import type { ReactNode } from 'react';
import { useTheme, type Breakpoint } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export interface ResponsiveDataViewProps {
  desktop: ReactNode;
  mobile: ReactNode;
  /**
   * MUI Breakpoint at which the layout switches from mobile card lists to desktop tables.
   * Defaults to 'md' (900px).
   */
  breakpoint?: Breakpoint;
}

export function ResponsiveDataView({
  desktop,
  mobile,
  breakpoint = 'md',
}: ResponsiveDataViewProps) {
  const theme = useTheme();
  // Safe responsive breakpoint query
  const isWide = useMediaQuery(theme.breakpoints.up(breakpoint));

  // Conditionally render only one branch to prevent duplicate DOM IDs & accessibility node issues
  if (isWide) {
    return <>{desktop}</>;
  }

  return <>{mobile}</>;
}
