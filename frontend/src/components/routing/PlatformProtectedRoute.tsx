import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { platformTokenStorage } from '../../utils/platformTokenStorage';
import { platformApi } from '../../lib/platformApi';

export function PlatformProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = platformTokenStorage.getAccess();
    if (!token) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }

    platformApi
      .get('/platform/auth/me')
      .then((res) => {
        setAuthenticated(true);
        setMustChangePassword(Boolean(res.data.mustChangePassword));
      })
      .catch(() => {
        platformTokenStorage.clear();
        setAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [location.pathname]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/platform-admin/login" replace />;
  }

  if (mustChangePassword && location.pathname !== '/platform-admin/change-password') {
    return <Navigate to="/platform-admin/change-password" replace />;
  }

  return <Outlet />;
}
