import type { ReactNode } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Stack, Chip, Avatar } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { tokens } from '../../../theme/tokens';

export interface StatCardTrend {
  label: string;
  direction: 'up' | 'down' | 'neutral';
  /**
   * Trend indicator color tone.
   */
  tone?: 'success' | 'error' | 'warning' | 'neutral';
}

export interface StatCardProps {
  /** Label describing the metric (e.g., "Total véhicules", "Montant total") */
  label: string;
  /** Primary metric display value */
  value: string | number;
  /** Optional icon component to render inside the colored circular badge */
  icon?: ReactNode;
  /**
   * Background color of the circular icon container badge.
   * Accepts theme palette keys (e.g. 'primary.light', 'success.light', 'info.light', 'warning.light', 'error.light')
   * or custom hex/CSS colors.
   */
  iconBgColor?: string;
  /**
   * Foreground/stroke color of the icon inside the colored circle badge.
   * GLOBALLY DEFAULTED TO WHITE (#FFFFFF) across the entire ERP via design token tokens.customColors.statCardIconForeground.
   */
  iconColor?: string;
  /** Optional secondary helper text under the value */
  helperText?: string;
  /** Optional trend badge indicator */
  trend?: StatCardTrend;
  /** Loading state flag displaying Skeleton loader for value */
  loading?: boolean;
  /** Custom typography color for the metric value text */
  valueColor?: string;
}

/**
 * Shared StatCard component for the Transport Management ERP visual identity.
 *
 * NOTE: Statistic-card icon foreground is globally white (#FFFFFF) by default.
 * Only the icon background color (iconBgColor) should vary by metric.
 */
export function StatCard({
  label,
  value,
  icon,
  iconBgColor = 'primary.light',
  iconColor = tokens.customColors.statCardIconForeground || '#FFFFFF',
  helperText,
  trend,
  loading = false,
  valueColor,
}: StatCardProps) {
  // Determine trend color mapping safely
  let trendColor: 'success' | 'error' | 'warning' | 'default' = 'default';
  if (trend?.tone === 'success') trendColor = 'success';
  else if (trend?.tone === 'error') trendColor = 'error';
  else if (trend?.tone === 'warning') trendColor = 'warning';

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <ArrowUpwardIcon sx={{ fontSize: 14 }} />;
    if (trend.direction === 'down') return <ArrowDownwardIcon sx={{ fontSize: 14 }} />;
    return <ArrowRightIcon sx={{ fontSize: 14 }} />;
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 82,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: (theme) => `${theme.customRadii.medium}px`,
      }}
    >
      <CardContent
        sx={{
          p: '12px !important',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          flex: 1,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>
              {label}
            </Typography>

            {loading ? (
              <Skeleton width={70} height={30} sx={{ mt: 0.25 }} />
            ) : (
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.375rem' },
                  fontWeight: 700,
                  lineHeight: 1.1,
                  mt: 0.25,
                  color: valueColor || 'text.primary',
                }}
              >
                {value}
              </Typography>
            )}
          </Box>

          {icon && (
            <Avatar
              sx={{
                bgcolor: iconBgColor,
                color: iconColor,
                width: 32,
                height: 32,
                flexShrink: 0,
                '& svg': {
                  color: iconColor,
                  fill: 'currentColor',
                  fontSize: 18,
                },
              }}
            >
              {icon}
            </Avatar>
          )}
        </Stack>

        {(trend || helperText) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            {trend && !loading && (
              <Chip
                label={trend.label}
                color={trendColor}
                size="small"
                icon={getTrendIcon() || undefined}
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  '& .MuiChip-icon': {
                    marginLeft: '3px',
                    marginRight: '-3px',
                  },
                }}
              />
            )}

            {helperText && !loading && (
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {helperText}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

