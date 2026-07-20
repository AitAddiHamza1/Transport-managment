import type { ReactNode } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Stack, Chip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

export interface StatCardTrend {
  label: string;
  direction: 'up' | 'down' | 'neutral';
  /**
   * Trend indicator color tone.
   */
  tone?: 'success' | 'error' | 'warning' | 'neutral';
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helperText?: string;
  trend?: StatCardTrend;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  helperText,
  trend,
  loading = false,
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
    <Card variant="outlined" sx={{ width: '100%', minHeight: 110 }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            
            {loading ? (
              <Skeleton width={80} height={36} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                {value}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                bgcolor: 'background.default',
                p: 1,
                borderRadius: (theme) => `${theme.customRadii.small}px`,
                color: 'text.secondary',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>

        {(trend || helperText) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            {trend && !loading && (
              <Chip
                label={trend.label}
                color={trendColor}
                size="small"
                icon={getTrendIcon() || undefined}
                sx={{
                  height: 20,
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  '& .MuiChip-icon': {
                    marginLeft: '4px',
                    marginRight: '-4px',
                  },
                }}
              />
            )}
            
            {helperText && !loading && (
              <Typography variant="caption" color="text.secondary">
                {helperText}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
