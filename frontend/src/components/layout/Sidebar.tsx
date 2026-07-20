import { useState, useEffect, useMemo } from 'react';
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
import { usePermission } from '../../features/auth/usePermission';
import { NAVIGATION_ITEMS } from '../../constants/navigation';
import { isPathActive, isNavigationGroupActive } from '../../utils/navigation';


interface SidebarProps {
  collapsed: boolean;
  onItemClick?: () => void; // Used to close the mobile drawer
}

export function Sidebar({ collapsed, onItemClick }: SidebarProps) {
  const ACTIVE_INDICATOR_WIDTH = 3;
  const { can } = usePermission();
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

  // Filter navigation entries according to permissions.
  // Memoized: `can` has a stable reference (useCallback keyed on matrix+isAdminGeneral in usePermission),
  // so this only recomputes when the authenticated user's permissions change.
  const filteredNav = useMemo(
    () =>
      NAVIGATION_ITEMS.filter((entry) => {
        if (entry.kind === 'leaf') {
          // NavLeaf.action is typed as PermissionAction | undefined — no cast needed.
          return can(entry.leaf.moduleKey, entry.leaf.action ?? 'voir');
        }
        // Group is visible only if at least one child is permitted.
        return entry.group.children.some((child) => can(child.moduleKey, 'voir'));
      }),
    [can],
  );


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
                selected={active}
                aria-current={active ? 'page' : undefined}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  minHeight: 46,
                  px: collapsed ? 1.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderLeft: `${ACTIVE_INDICATOR_WIDTH}px solid transparent`,
                  
                  // 1. DEFAULT STATE
                  bgcolor: 'transparent',
                  color: 'customColors.sidebarMutedText',
                  '& .MuiListItemIcon-root': {
                    color: 'customColors.sidebarIcon',
                  },
                  
                  // 2. HOVER STATE
                  '&:hover': {
                    bgcolor: 'customColors.sidebarHoverBackground',
                    color: 'customColors.sidebarText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                  
                  // 3. SELECTED / ACTIVE STATE
                  '&.Mui-selected': {
                    bgcolor: 'customColors.sidebarSelectedBackground',
                    color: 'customColors.sidebarText',
                    borderLeft: (theme) => `${ACTIVE_INDICATOR_WIDTH}px solid ${theme.palette.primary.main}`,
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                  
                  // 4. SELECTED HOVER STATE
                  '&.Mui-selected:hover': {
                    bgcolor: 'customColors.sidebarSelectedHoverBackground',
                    color: 'customColors.sidebarText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                  
                  // 5. DISABLED STATE
                  '&.Mui-disabled': {
                    bgcolor: 'transparent',
                    color: 'customColors.sidebarDisabledText',
                    '& .MuiListItemIcon-root': {
                      color: 'customColors.sidebarDisabledIcon',
                    },
                  },
                  
                  // 6. FOCUS-VISIBLE STATE
                  '&:focus-visible': {
                    outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '-2px',
                  },

                  transition: (theme) =>
                    theme.transitions.create(['background-color', 'color', 'border-left-color', 'padding', 'justify-content'], {
                      duration: theme.customTransitions.durationNormal,
                      easing: theme.customTransitions.easing,
                    }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 36,
                    mr: collapsed ? 0 : 0.5,
                    color: 'inherit',
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
              selected={false} // Expansions do not toggle selected state
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                minHeight: 46,
                px: collapsed ? 1.5 : 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderLeft: `${ACTIVE_INDICATOR_WIDTH}px solid transparent`,
                
                // 1. DEFAULT/EXPANDED STATE (active checks if group has active child)
                bgcolor: 'transparent',
                color: active ? 'customColors.sidebarText' : 'customColors.sidebarMutedText',
                '& .MuiListItemIcon-root': {
                  color: active ? 'primary.main' : 'customColors.sidebarIcon',
                },
                '& .MuiSvgIcon-root:not(.MuiListItemIcon-root .MuiSvgIcon-root)': {
                  color: active ? 'customColors.sidebarText' : 'customColors.sidebarMutedText',
                },
                
                // 2. HOVER STATE
                '&:hover': {
                  bgcolor: 'customColors.sidebarHoverBackground',
                  color: 'customColors.sidebarText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '& .MuiSvgIcon-root:not(.MuiListItemIcon-root .MuiSvgIcon-root)': {
                    color: 'customColors.sidebarText',
                  },
                },
                
                // 3. DISABLED STATE
                '&.Mui-disabled': {
                  bgcolor: 'transparent',
                  color: 'customColors.sidebarDisabledText',
                  '& .MuiListItemIcon-root': {
                    color: 'customColors.sidebarDisabledIcon',
                  },
                  '& .MuiSvgIcon-root:not(.MuiListItemIcon-root .MuiSvgIcon-root)': {
                    color: 'customColors.sidebarDisabledText',
                  },
                },
                
                // 4. FOCUS-VISIBLE STATE
                '&:focus-visible': {
                  outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '-2px',
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
                  color: 'inherit',
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
                          selected={childActive}
                          aria-current={childActive ? 'page' : undefined}
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.5,
                            minHeight: 40,
                            px: 2,
                            pl: 4,
                            borderLeft: `${ACTIVE_INDICATOR_WIDTH}px solid transparent`,
                            
                            // 1. DEFAULT STATE
                            bgcolor: 'transparent',
                            color: 'customColors.sidebarMutedText',
                            
                            // 2. HOVER STATE
                            '&:hover': {
                              bgcolor: 'customColors.sidebarHoverBackground',
                              color: 'customColors.sidebarText',
                            },
                            
                            // 3. SELECTED / ACTIVE STATE
                            '&.Mui-selected': {
                              bgcolor: 'customColors.sidebarSelectedBackground',
                              color: 'customColors.sidebarText',
                              borderLeft: (theme) => `${ACTIVE_INDICATOR_WIDTH}px solid ${theme.palette.primary.main}`,
                            },
                            
                            // 4. SELECTED HOVER STATE
                            '&.Mui-selected:hover': {
                              bgcolor: 'customColors.sidebarSelectedHoverBackground',
                              color: 'customColors.sidebarText',
                            },
                            
                            // 5. DISABLED STATE
                            '&.Mui-disabled': {
                              bgcolor: 'transparent',
                              color: 'customColors.sidebarDisabledText',
                            },
                            
                            // 6. FOCUS-VISIBLE STATE
                            '&:focus-visible': {
                              outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: '-2px',
                            },

                            transition: (theme) =>
                              theme.transitions.create(['color', 'background-color', 'border-left-color'], {
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
              border: (theme) => `1px solid ${theme.customColors.sidebarBorder}`,
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
                    selected={childActive}
                    onClick={() => {
                      handleCloseMenu();
                      if (onItemClick) onItemClick();
                    }}
                    sx={{
                      fontSize: '0.8125rem',
                      py: 1,
                      borderLeft: `${ACTIVE_INDICATOR_WIDTH}px solid transparent`,
                      
                      // 1. DEFAULT STATE
                      bgcolor: 'transparent',
                      color: 'customColors.sidebarMutedText',
                      
                      // 2. HOVER STATE
                      '&:hover': {
                        bgcolor: 'customColors.sidebarHoverBackground',
                        color: 'customColors.sidebarText',
                      },
                      
                      // 3. SELECTED / ACTIVE STATE
                      '&.Mui-selected': {
                        bgcolor: 'customColors.sidebarSelectedBackground',
                        color: 'customColors.sidebarText',
                        borderLeft: (theme) => `${ACTIVE_INDICATOR_WIDTH}px solid ${theme.palette.primary.main}`,
                      },
                      
                      // 4. SELECTED HOVER STATE
                      '&.Mui-selected:hover': {
                        bgcolor: 'customColors.sidebarSelectedHoverBackground',
                        color: 'customColors.sidebarText',
                      },
                      
                      // 5. DISABLED STATE
                      '&.Mui-disabled': {
                        bgcolor: 'transparent',
                        color: 'customColors.sidebarDisabledText',
                      },
                      
                      // 6. FOCUS-VISIBLE STATE
                      '&:focus-visible': {
                        outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: '-2px',
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
