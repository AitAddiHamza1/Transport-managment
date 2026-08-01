import type { ReactElement } from 'react';
import { Chip } from '@mui/material';

export interface StatusChipProps {
  /**
   * Visible label text (always required)
   */
  label: string;
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
  icon?: ReactElement;
}

export function StatusChip({
  label,
  variant = 'default',
  size = 'small',
  icon,
}: StatusChipProps) {
  // MUI Chips do not support 'neutral' color natively.
  // We resolve color mapping dynamically without unsafe string-to-color typecasting.
  let muiColor: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';

  if (variant === 'success') muiColor = 'success';
  else if (variant === 'warning') muiColor = 'warning';
  else if (variant === 'error') muiColor = 'error';
  else if (variant === 'info') muiColor = 'info';

  const isNeutral = variant === 'neutral';

  return (
    <Chip
      label={label}
      color={muiColor}
      size={size}
      icon={icon}
      variant={isNeutral ? 'outlined' : 'filled'}
      sx={{
        fontWeight: 600,
        borderRadius: (theme) => `${theme.customRadii.small}px`,
        // Custom styling neutral chips cleanly using theme tokens
        ...(isNeutral && {
          bgcolor: 'background.default',
          color: 'text.secondary',
          borderColor: (theme) => theme.palette.divider,
        }),
      }}
    />
  );
}
