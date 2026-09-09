import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import { platformTokenStorage } from '../../utils/platformTokenStorage';
import { platformApi } from '../../lib/platformApi';

export function PlatformAdminLayout() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('Administrateur');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    platformApi.get('/platform/auth/me').then((res) => {
      if (res.data.nom) setAdminName(res.data.nom);
    }).catch(() => {});
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    platformTokenStorage.clear();
    navigate('/platform-admin/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: '#1e293b', borderBottom: '1px solid #334155', boxShadow: 'none' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AdminPanelSettingsIcon sx={{ color: '#38bdf8', fontSize: 32 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.5px', color: '#f8fafc' }}>
                Plateforme Admin SaaS
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                component={Link}
                to="/platform-admin/companies"
                startIcon={<BusinessIcon />}
                sx={{ color: '#94a3b8', '&:hover': { color: '#38bdf8' } }}
              >
                Entreprises
              </Button>

              <IconButton onClick={handleMenuOpen} sx={{ color: '#e2e8f0', p: 1 }}>
                <AccountCircleIcon fontSize="large" />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    bgcolor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    minWidth: 200,
                  },
                }}
              >
                <MenuItem disabled sx={{ opacity: '1 !important', borderBottom: '1px solid #334155', pb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#38bdf8' }}>
                    {adminName}
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: '#f87171', pt: 1.5 }}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Déconnexion
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
