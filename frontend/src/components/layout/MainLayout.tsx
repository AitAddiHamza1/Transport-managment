import { useState } from 'react';
import { Box, Drawer } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { LAYOUT } from '../../constants/layout';

// Safe localStorage access helpers
const getSidebarCollapsedPreference = (): boolean => {
  try {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
};

const setSidebarCollapsedPreference = (collapsed: boolean): void => {
  try {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  } catch {
    // Ignore storage issues in sandbox
  }
};

export function MainLayout() {
  const theme = useTheme();
  // Persistent sidebar matches lg screens (1200px) and above.
  // 1024px tablet/small screens and 768px use mobile drawer.
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getSidebarCollapsedPreference);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsedPreference(next);
      return next;
    });
  };

  const handleCloseMobileDrawer = () => {
    setMobileOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: ['100vh', '100dvh'], // Fallback for modern viewport units
        width: '100vw',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Header Topbar */}
      <AppHeader
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onToggleMobileDrawer={() => setMobileOpen(true)}
        isDesktop={isDesktop}
      />

      {/* Navigation - Unmounts inactive tree to prevent duplicates */}
      <Box
        component="nav"
        sx={{
          width: isDesktop
            ? collapsed
              ? LAYOUT.SIDEBAR_COLLAPSED_WIDTH
              : LAYOUT.SIDEBAR_EXPANDED_WIDTH
            : 0,
          flexShrink: 0,
          transition: theme.transitions.create(['width'], {
            duration: theme.customTransitions.durationNormal,
            easing: theme.customTransitions.easing,
          }),
        }}
      >
        {isDesktop ? (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': (t) => ({
                boxSizing: 'border-box',
                width: collapsed ? LAYOUT.SIDEBAR_COLLAPSED_WIDTH : LAYOUT.SIDEBAR_EXPANDED_WIDTH,
                backgroundColor: t.customColors.sidebarBackground,
                color: t.customColors.sidebarText,
                borderRight: `1px solid ${t.customColors.sidebarBorder}`,
                overflow: 'hidden',
                transition: t.transitions.create(['width'], {
                  duration: t.customTransitions.durationNormal,
                  easing: t.customTransitions.easing,
                }),
              }),
            }}
          >
            <Sidebar collapsed={collapsed} />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleCloseMobileDrawer}
            ModalProps={{ keepMounted: true }} // Better mobile touch performance
            sx={{
              '& .MuiDrawer-paper': (t) => ({
                boxSizing: 'border-box',
                width: { xs: 'min(280px, 85vw)', sm: 280 }, // Usable width on narrow screens (< 320px)
                backgroundColor: t.customColors.sidebarBackground,
                color: t.customColors.sidebarText,
                borderRight: `1px solid ${t.customColors.sidebarBorder}`,
              }),
            }}
          >
            {/* Mobile Drawer is always expanded (collapsed={false}) */}
            <Sidebar collapsed={false} onItemClick={handleCloseMobileDrawer} />
          </Drawer>
        )}
      </Box>

      {/* Workspace container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%', // Full horizontal space by default for ERP pages
          height: ['100vh', '100dvh'], // Fallback for modern viewport units
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden', // Prevents double scrollbar
        }}
      >
        {/* Spacer for the fixed Header */}
        <Box sx={{ minHeight: LAYOUT.HEADER_HEIGHT }} />

        {/* Scrollable page container - permits sticky tables & Dialog components */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: { xs: 2, md: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
