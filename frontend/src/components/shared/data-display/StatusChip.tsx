import type { ReactElement } from 'react';
import { Chip } from '@mui/material';
import { getStatusConfig } from '../../../constants/statuses';

export interface StatusChipProps {
  /**
   * Visible label text (always required)
   */
  label: string;
  /**
   * Semantic variant tone or business status string key.
   * Directly supports confirmed status keys (e.g. 'ACTIF', 'DISPONIBLE', 'PAYEE', 'BLOQUE')
   * or design system semantic variants ('success', 'warning', 'error', 'info', 'neutral', 'default').
   */
  variant?: string;
  size?: 'small' | 'medium';
  icon?: ReactElement;
}

export function StatusChip({
  label,
  variant = 'default',
  size = 'small',
  icon,
}: StatusChipProps) {
  // Retrieve status configuration mapping if available
  const config = getStatusConfig(variant);
  const displayLabel = label || config.label;

  // Resolve soft background and text colors cleanly
  let bg = config.bg;
  let text = config.text;

  if (!bg || !text) {
    if (variant === 'success') {
      bg = '#ECFDF5';
      text = '#047857';
    } else if (variant === 'warning') {
      bg = '#FEF3C7';
      text = '#B45309';
    } else if (variant === 'error') {
      bg = '#FEE2E2';
      text = '#B91C1C';
    } else if (variant === 'info') {
      bg = '#EFF6FF';
      text = '#1D4ED8';
    }
  }

  const isNeutral = variant === 'neutral' || variant === 'default';

  return (
    <Chip
      label={displayLabel}
      size={size}
      icon={icon}
      variant="filled"
      sx={{
        fontWeight: 600,
        fontSize: '0.725rem',
        height: size === 'small' ? 22 : 26,
        borderRadius: (theme) => `${theme.customRadii.small}px`,
        border: '1px solid transparent',
        ...(bg && text
          ? {
              bgcolor: bg,
              color: text,
              borderColor: `${text}22`,
            }
          : isNeutral
          ? {
              bgcolor: 'background.default',
              color: 'text.secondary',
              borderColor: (theme) => theme.palette.divider,
            }
          : {
              bgcolor: 'primary.light',
              color: 'primary.dark',
            }),
      }}
    />
  );
}

