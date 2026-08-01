import type { ReactNode } from 'react';
import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {/* Breadcrumbs Navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 1 }}
          aria-label="fil d'Ariane"
        >
          {breadcrumbs.map((crumb, index) =>
            crumb.to ? (
              <Link
                key={index}
                component={RouterLink}
                to={crumb.to}
                underline="hover"
                color="inherit"
                sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography
                key={index}
                color="text.secondary"
                sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      {/* Title and Actions stack */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: 'text.primary' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {action && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              mt: { xs: 1, sm: 0 },
            }}
          >
            {action}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
