import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useLocation } from 'react-router-dom';
import { LAYOUT } from '../../constants/layout';
import { UserMenu } from './UserMenu';
import { getNavigationTitle } from '../../utils/navigation';

interface AppHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleMobileDrawer: () => void;
  isDesktop: boolean;
}

export function AppHeader({
  collapsed,
  onToggleCollapse,
  onToggleMobileDrawer,
  isDesktop,
}: AppHeaderProps) {
  const location = useLocation();
  const pageTitle = getNavigationTitle(location.pathname) || 
    (location.pathname === '/design-system' ? 'Système de Design' : 'Gestion de Transport');

  return (
    <AppBar
      position="fixed"
      sx={{
        width: isDesktop
          ? `calc(100% - ${collapsed ? LAYOUT.SIDEBAR_COLLAPSED_WIDTH : LAYOUT.SIDEBAR_EXPANDED_WIDTH}px)`
          : '100%',
        ml: isDesktop
          ? `${collapsed ? LAYOUT.SIDEBAR_COLLAPSED_WIDTH : LAYOUT.SIDEBAR_EXPANDED_WIDTH}px`
          : 0,
        height: LAYOUT.HEADER_HEIGHT,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: (theme) =>
          theme.transitions.create(['width', 'margin-left'], {
            duration: theme.customTransitions.durationNormal,
            easing: theme.customTransitions.easing,
          }),
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: (theme) => theme.customShadows.subtle,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ height: '100%', px: { xs: 2, md: 3 } }}>
        {isDesktop ? (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
            sx={{ mr: 2 }}
          >
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        ) : (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onToggleMobileDrawer}
            aria-label="Ouvrir le menu de navigation"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600 }}>
          {pageTitle}
        </Typography>

        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
