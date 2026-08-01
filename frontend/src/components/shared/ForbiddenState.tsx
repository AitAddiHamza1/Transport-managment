/**
 * ForbiddenState — Reusable "access denied" presentation component.
 *
 * Used by:
 *  - ForbiddenPage (full /403 route page — wraps this inside AppPage)
 *  - PermissionRoute (inline forbidden within the page layout)
 *
 * The "Retour au tableau de bord" action is conditional: it only appears when
 * the user actually has dashboard/voir permission. A user denied the dashboard
 * itself should not be sent back there, as it would just show another
 * ForbiddenState. In that case, only "Page précédente" is shown.
 *
 * Does not expose technical permission details to end users.
 */
import { Box, Button, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../../features/auth/usePermission';

export interface ForbiddenStateProps {
  /**
   * Override the default description message.
   * Do not include internal module keys or technical details.
   */
  description?: string;
}

export function ForbiddenState({
  description = "Vous ne disposez pas des autorisations nécessaires pour accéder à cette ressource.",
}: ForbiddenStateProps) {
  const navigate = useNavigate();
  const { can } = usePermission();

  // Only show the dashboard shortcut when the user actually has access to it.
  // A user denied dashboard/voir would just hit another ForbiddenState there.
  const canSeeDashboard = can('dashboard', 'voir');

  return (
    <Box
      role="main"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: { xs: 6, md: 10 },
        px: 3,
        minHeight: 320,
        gap: 3,
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'error.lighter',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'error.main',
          flexShrink: 0,
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 40 }} />
      </Box>

      {/* Heading — semantic h1 for accessibility */}
      <Box>
        <Typography
          component="h1"
          variant="h4"
          fontWeight={700}
          gutterBottom
        >
          Accès refusé
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 480, mx: 'auto' }}
        >
          {description}
        </Typography>
      </Box>

      {/* Actions */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
        >
          Page précédente
        </Button>
        {canSeeDashboard && (
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Retour au tableau de bord
          </Button>
        )}
      </Stack>
    </Box>
  );
}
