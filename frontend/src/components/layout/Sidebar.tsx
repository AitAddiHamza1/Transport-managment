import { useState, useEffect } from 'react';
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { NAVIGATION_ITEMS } from '../../constants/navigation';
import { isPathActive, isNavigationGroupActive } from '../../utils/navigation';

interface SidebarProps {
  collapsed: boolean;
  onItemClick?: () => void; // Used to close the mobile drawer
}

export function Sidebar({ collapsed, onItemClick }: SidebarProps) {
  const { can } = useAuth();
  const location = useLocation();

  // State for expanded groups in expanded sidebar mode
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Anchor and active group state for floating menus in collapsed mode
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Track the last pathname to trigger group expansions only on actual navigation shifts
  const [lastPathname, setLastPathname] = useState('');

  useEffect(() => {
    if (location.pathname !== lastPathname) {
      setLastPathname(location.pathname);

      const newOpenState = { ...openGroups };
      let changed = false;

      NAVIGATION_ITEMS.forEach((entry) => {
        if (entry.kind === 'group') {
          const { group } = entry;
          const hasActiveChild = isNavigationGroupActive(location.pathname, group);
          // Auto-expand group if it contains the active route and is not already expanded
          if (hasActiveChild && !openGroups[group.id]) {
            newOpenState[group.id] = true;
            changed = true;
          }
        }
      });

      if (changed) {
        setOpenGroups(newOpenState);
      }
    }
  }, [location.pathname, lastPathname, openGroups]);

  const handleGroupClick = (event: React.MouseEvent<HTMLElement>, groupId: string) => {
    if (collapsed) {
      setMenuAnchorEl(event.currentTarget);
      setActiveGroupId(groupId);
    } else {
      setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    }
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setActiveGroupId(null);
  };

  // Helper to determine active states cleanly
  const isLeafActive = (to: string) => isPathActive(location.pathname, to);

  const isGroupActive = (children: { to: string }[]) => {
    return children.some((child) => isPathActive(location.pathname, child.to));
  };

  // Filter navigation entries according to permissions
  const filteredNav = NAVIGATION_ITEMS.filter((entry) => {
    if (entry.kind === 'leaf') {
      return can(entry.leaf.moduleKey, entry.leaf.action as any || 'voir');
    }
    // Group is visible if at least one child is permitted
    return entry.group.children.some((child) => can(child.moduleKey, 'voir'));
  });

  const activeGroup = NAVIGATION_ITEMS.find(
    (item) => item.kind === 'group' && item.group.id === activeGroupId
  );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'customColors.sidebarBackground',
        color: 'customColors.sidebarText',
      }}
    >
      {/* Brand Header Area */}
      <Toolbar
        sx={{
          gap: 1.5,
          px: collapsed ? 2 : 2.5,
          height: 64,
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          transition: (theme) =>
            theme.transitions.create(['padding', 'justify-content'], {
              duration: theme.customTransitions.durationNormal,
              easing: theme.customTransitions.easing,
            }),
        }}
      >
        <LocalShippingIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        {!collapsed && (
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'customColors.sidebarText',
              fontSize: '1.125rem',
            }}
          >
            Transport ERP
          </Typography>
        )}
      </Toolbar>

      {/* Navigation List */}
      <List
        aria-label="Navigation principale"
        sx={{
          flexGrow: 1,
          px: 1,
          py: 2,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {filteredNav.map((entry) => {
          if (entry.kind === 'leaf') {
            const { leaf } = entry;
            const active = isLeafActive(leaf.to);

            const leafButton = (
              <ListItemButton
                component={NavLink}
                to={leaf.to}
                end={leaf.to === '/'}
                onClick={() => {
                  if (onItemClick) onItemClick();
                }}
                aria-current={active ? 'page' : undefined}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  minHeight: 46,
                  px: collapsed ? 1.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active ? '#FFFFFF' : 'customColors.sidebarMutedText',
                  '&:hover': {
                    bgcolor: active ? 'primary.dark' : 'customColors.sidebarHover',
                    color: '#FFFFFF',
                    '& .MuiListItemIcon-root': {
                      color: '#FFFFFF',
                    },
                  },
                  transition: (theme) =>
                    theme.transitions.create(['background-color', 'color', 'padding', 'justify-content'], {
                      duration: theme.customTransitions.durationNormal,
                      easing: theme.customTransitions.easing,
                    }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 36,
                    mr: collapsed ? 0 : 0.5,
                    color: active ? '#FFFFFF' : 'customColors.sidebarIcon',
                    transition: (theme) =>
                      theme.transitions.create('color', {
                        duration: theme.customTransitions.durationNormal,
                        easing: theme.customTransitions.easing,
                      }),
                  }}
                >
                  {leaf.icon}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={leaf.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }} />}
              </ListItemButton>
            );

            return collapsed ? (
              <Tooltip key={leaf.to} title={leaf.label} placement="right" arrow>
                {leafButton}
              </Tooltip>
            ) : (
              <Box key={leaf.to}>{leafButton}</Box>
            );
          }

          // Render group entry
          const { group } = entry;
          const groupOpen = Boolean(openGroups[group.id]);
          const active = isGroupActive(group.children);
          const visibleChildren = group.children.filter((c) => can(c.moduleKey, 'voir'));

          const groupButton = (
            <ListItemButton
              onClick={(e) => handleGroupClick(e, group.id)}
              aria-expanded={groupOpen}
              aria-controls={groupOpen ? `group-menu-${group.id}` : undefined}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                minHeight: 46,
                px: collapsed ? 1.5 : 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                bgcolor: active ? 'customColors.sidebarSurface' : 'transparent',
                color: active ? '#FFFFFF' : 'customColors.sidebarMutedText',
                border: active ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent',
                '&:hover': {
                  bgcolor: 'customColors.sidebarHover',
                  color: '#FFFFFF',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                transition: (theme) =>
                  theme.transitions.create(['background-color', 'color', 'padding', 'justify-content'], {
                    duration: theme.customTransitions.durationNormal,
                    easing: theme.customTransitions.easing,
                  }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  mr: collapsed ? 0 : 0.5,
                  color: active ? 'primary.main' : 'customColors.sidebarIcon',
                  transition: (theme) =>
                    theme.transitions.create('color', {
                      duration: theme.customTransitions.durationNormal,
                      easing: theme.customTransitions.easing,
                    }),
                }}
              >
                {group.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={group.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }} />}
              {!collapsed && (
                groupOpen ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />
              )}
            </ListItemButton>
          );

          return (
            <Box key={group.id}>
              {collapsed ? (
                <Tooltip title={group.label} placement="right" arrow>
                  {groupButton}
                </Tooltip>
              ) : (
                groupButton
              )}

              {/* Submenu links in expanded mode */}
              {!collapsed && (
                <Collapse in={groupOpen} timeout="auto" unmountOnExit id={`group-menu-${group.id}`}>
                  <List disablePadding sx={{ pl: 2, mt: 0.5 }}>
                    {visibleChildren.map((child) => {
                      const childActive = isLeafActive(child.to);
                      return (
                        <ListItemButton
                          key={child.to}
                          component={NavLink}
                          to={child.to}
                          onClick={() => {
                            if (onItemClick) onItemClick();
                          }}
                          aria-current={childActive ? 'page' : undefined}
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.5,
                            minHeight: 40,
                            px: 2,
                            color: childActive ? 'primary.main' : 'customColors.sidebarMutedText',
                            bgcolor: 'transparent',
                            '&:hover': {
                              bgcolor: 'customColors.sidebarHover',
                              color: '#FFFFFF',
                            },
                            transition: (theme) =>
                              theme.transitions.create(['color', 'background-color'], {
                                duration: theme.customTransitions.durationNormal,
                                easing: theme.customTransitions.easing,
                              }),
                          }}
                        >
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              fontSize: '0.8125rem',
                              fontWeight: childActive ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>

      {/* Collapsed Mode Floating Submenu anchored next to icons */}
      {collapsed && (
        <Menu
          id="sidebar-group-menu"
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{
            sx: {
              bgcolor: 'customColors.sidebarSurface',
              color: 'customColors.sidebarText',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: (theme) => theme.customShadows.floating,
              minWidth: 180,
              mt: -0.5,
            },
          }}
        >
          {activeGroup &&
            activeGroup.kind === 'group' &&
            activeGroup.group.children
              .filter((child) => can(child.moduleKey, 'voir'))
              .map((child) => {
                const childActive = isLeafActive(child.to);
                return (
                  <MenuItem
                    key={child.to}
                    component={NavLink}
                    to={child.to}
                    onClick={() => {
                      handleCloseMenu();
                      if (onItemClick) onItemClick();
                    }}
                    sx={{
                      color: childActive ? 'primary.main' : 'customColors.sidebarMutedText',
                      fontWeight: childActive ? 600 : 400,
                      fontSize: '0.8125rem',
                      py: 1,
                      '&:hover': {
                        bgcolor: 'customColors.sidebarHover',
                        color: '#FFFFFF',
                      },
                    }}
                  >
                    {child.label}
                  </MenuItem>
                );
              })}
        </Menu>
      )}
    </Box>
  );
}
