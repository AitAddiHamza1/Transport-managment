import { useState } from 'react';
import {
  Avatar,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  Stack,
  Box,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';

export function UserMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.nom
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      {/* Hide user labels on extremely small devices to prevent Header cluttering */}
      <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', display: 'block' }}>
          {user?.nom}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.675rem' }}>
          {user?.role}
        </Typography>
      </Box>
      
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        aria-label="Profil utilisateur"
        aria-controls={anchorEl ? 'user-profile-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
        sx={{ p: 0.5 }}
      >
        <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: '0.875rem', fontWeight: 600 }}>
          {initials}
        </Avatar>
      </IconButton>

      <Menu
        id="user-profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 2,
          sx: { mt: 1, minWidth: 150 },
        }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Déconnexion
        </MenuItem>
      </Menu>
    </Stack>
  );
}
