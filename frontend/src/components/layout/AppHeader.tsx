import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useLocation } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../constants/navigation';
import { LAYOUT } from '../../constants/layout';
import { UserMenu } from './UserMenu';

interface AppHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleMobileDrawer: () => void;
  isDesktop: boolean;
}

function getHeaderTitle(pathname: string): string {
  if (pathname === '/') {
    return 'Tableau de bord';
  }
  if (pathname === '/design-system') {
    return 'Système de Design';
  }

  let bestMatch: { path: string; label: string } | null = null;

  const checkMatch = (to: string, label: string) => {
    if (pathname === to || pathname.startsWith(to + '/')) {
      if (!bestMatch || to.length > bestMatch.path.length) {
        bestMatch = { path: to, label };
      }
    }
  };

  NAVIGATION_ITEMS.forEach((item) => {
    if (item.kind === 'leaf') {
      checkMatch(item.leaf.to, item.leaf.label);
    } else if (item.kind === 'group') {
      checkMatch(item.group.to, item.group.label);
      item.group.children.forEach((child) => {
        checkMatch(child.to, child.label);
      });
    }
  });

  return bestMatch ? (bestMatch as any).label : 'Gestion de Transport';
}

export function AppHeader({
  collapsed,
  onToggleCollapse,
  onToggleMobileDrawer,
  isDesktop,
}: AppHeaderProps) {
  const location = useLocation();
  const pageTitle = getHeaderTitle(location.pathname);

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
