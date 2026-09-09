import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermission } from '../../features/auth/usePermission';
import {
  DASHBOARD_NAV_ITEM,
  NAVIGATION_SECTIONS,
  NavLeaf,
  NavEntry,
} from '../../constants/navigation';
import {
  isPathActive,
  isNavigationGroupActive,
  isNavigationSectionActive,
} from '../../utils/navigation';

interface SidebarProps {
  collapsed: boolean;
  onItemClick?: () => void; // Used to close the mobile drawer
}

export function Sidebar({ collapsed, onItemClick }: SidebarProps) {
  const ACTIVE_INDICATOR_WIDTH = 3;
  const { can } = usePermission();
  const location = useLocation();

  // State for expanded domain sections in expanded sidebar mode
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  // State for expanded nested groups (e.g. vehicules sub-group)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Track the last pathname to trigger section & group auto-expansions on navigation shifts
  const [lastPathname, setLastPathname] = useState('');

  useEffect(() => {
    if (location.pathname !== lastPathname) {
      setLastPathname(location.pathname);

      let sectionsChanged = false;
      const newOpenSections = { ...openSections };

      let groupsChanged = false;
      const newOpenGroups = { ...openGroups };

      NAVIGATION_SECTIONS.forEach((section) => {
        const isSectionActive = isNavigationSectionActive(location.pathname, section);
        if (isSectionActive && !openSections[section.id]) {
          newOpenSections[section.id] = true;
          sectionsChanged = true;
        }

        section.items.forEach((entry) => {
          if (entry.kind === 'group') {
            const hasActiveChild = isNavigationGroupActive(location.pathname, entry.group);
            if (hasActiveChild && !openGroups[entry.group.id]) {
              newOpenGroups[entry.group.id] = true;
              groupsChanged = true;
            }
          }
        });
      });

      if (sectionsChanged) {
        setOpenSections(newOpenSections);
      }
      if (groupsChanged) {
        setOpenGroups(newOpenGroups);
      }
    }
  }, [location.pathname, lastPathname, openSections, openGroups]);

  const handleSectionToggle = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] !== undefined ? !prev[sectionId] : false,
    }));
  };

  const handleGroupToggle = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Helper to determine active states cleanly
  const isLeafActive = (to: string) => isPathActive(location.pathname, to);

  const canDashboard = can(DASHBOARD_NAV_ITEM.moduleKey, 'voir');

  // Filter sections and entries according to permissions.
  const filteredSections = useMemo(() => {
    return NAVIGATION_SECTIONS.map((section) => {
      const permittedItems = section.items.filter((entry) => {
        if (entry.kind === 'leaf') {
          return can(entry.leaf.moduleKey, entry.leaf.action ?? 'voir');
        }
        // Sub-group is visible if at least one child is permitted
        return entry.group.children.some((child) => can(child.moduleKey, 'voir'));
      });

      return {
        ...section,
        items: permittedItems,
      };
    }).filter((section) => section.items.length > 0);
  }, [can]);

  // Helper renderer for a single leaf item
  const renderNavLeaf = (leaf: NavLeaf, isChild = false) => {
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
          minHeight: isChild ? 40 : 44,
          px: collapsed ? 1.5 : 2,
          pl: isChild && !collapsed ? 4 : collapsed ? 1.5 : 2,
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

          // 5. FOCUS-VISIBLE STATE
          '&:focus-visible': {
            outline: (theme) => `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '-2px',
          },

          transition: (theme) =>
            theme.transitions.create(
              ['background-color', 'color', 'border-left-color', 'padding', 'justify-content'],
              {
                duration: theme.customTransitions.durationNormal,
                easing: theme.customTransitions.easing,
              },
            ),
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
        {!collapsed && (
          <ListItemText
            primary={leaf.label}
            primaryTypographyProps={{
              fontSize: isChild ? '0.8125rem' : '0.875rem',
              fontWeight: active ? 600 : 500,
            }}
          />
        )}
      </ListItemButton>
    );

    return collapsed ? (
      <Tooltip key={leaf.to} title={leaf.label} placement="right" arrow>
        {leafButton}
      </Tooltip>
    ) : (
      <Box key={leaf.to}>{leafButton}</Box>
    );
  };

  // Helper renderer for a nested group (e.g. Véhicules sub-group)
  const renderNavGroup = (group: NavEntry & { kind: 'group' }) => {
    const { group: grp } = group;
    const groupOpen = Boolean(openGroups[grp.id]);
    const active = grp.children.some((child) => isLeafActive(child.to));
    const visibleChildren = grp.children.filter((c) => can(c.moduleKey, 'voir'));

    if (visibleChildren.length === 0) return null;

    if (collapsed) {
      // In collapsed mode, render active child leaf or first visible child as direct icon with tooltip
      const activeChild = visibleChildren.find((c) => isLeafActive(c.to)) || visibleChildren[0];
      return renderNavLeaf({
        moduleKey: activeChild.moduleKey,
        label: `${grp.label} — ${activeChild.label}`,
        to: activeChild.to,
        icon: grp.icon,
      });
    }

    return (
      <Box key={grp.id}>
        <ListItemButton
          onClick={() => handleGroupToggle(grp.id)}
          aria-expanded={groupOpen}
          sx={{
            borderRadius: 1.5,
            mb: 0.5,
            minHeight: 44,
            px: 2,
            justifyContent: 'flex-start',
            bgcolor: 'transparent',
            color: active ? 'customColors.sidebarText' : 'customColors.sidebarMutedText',
            '& .MuiListItemIcon-root': {
              color: active ? 'primary.main' : 'customColors.sidebarIcon',
            },
            '&:hover': {
              bgcolor: 'customColors.sidebarHoverBackground',
              color: 'customColors.sidebarText',
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, mr: 0.5, color: 'inherit' }}>
            {grp.icon}
          </ListItemIcon>
          <ListItemText
            primary={grp.label}
            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }}
          />
          {groupOpen ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
        </ListItemButton>

        <Collapse in={groupOpen} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ mt: 0.5 }}>
            {visibleChildren.map((child) => renderNavLeaf(child, true))}
          </List>
        </Collapse>
      </Box>
    );
  };

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
          py: 1.5,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Standalone Dashboard Item */}
        {canDashboard && (
          <Box sx={{ mb: 1 }}>
            {renderNavLeaf(DASHBOARD_NAV_ITEM)}
            {!collapsed && (
              <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            )}
          </Box>
        )}

        {/* Permitted Functional Domain Sections */}
        {filteredSections.map((section) => {
          const sectionActive = isNavigationSectionActive(location.pathname, section);
          const isSectionOpen = openSections[section.id] ?? true;

          return (
            <Box key={section.id} sx={{ mb: collapsed ? 1 : 2 }}>
              {/* Section Header (Expanded Mode Only) */}
              {!collapsed && (
                <Box
                  onClick={() => handleSectionToggle(section.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.75,
                    cursor: 'pointer',
                    borderRadius: 1,
                    userSelect: 'none',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.70rem',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: sectionActive
                        ? 'primary.main'
                        : 'customColors.sidebarMutedText',
                    }}
                  >
                    {section.label}
                  </Typography>
                  {isSectionOpen ? (
                    <ExpandMore
                      sx={{
                        fontSize: 16,
                        color: sectionActive
                          ? 'primary.main'
                          : 'customColors.sidebarMutedText',
                      }}
                    />
                  ) : (
                    <ChevronRight
                      sx={{
                        fontSize: 16,
                        color: sectionActive
                          ? 'primary.main'
                          : 'customColors.sidebarMutedText',
                      }}
                    />
                  )}
                </Box>
              )}

              {/* Section Content */}
              {!collapsed ? (
                <Collapse in={isSectionOpen} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 0.5 }}>
                    {section.items.map((entry) =>
                      entry.kind === 'leaf'
                        ? renderNavLeaf(entry.leaf)
                        : renderNavGroup(entry),
                    )}
                  </Box>
                </Collapse>
              ) : (
                /* Collapsed Icon View (No section headers, direct leaf icons with tooltips) */
                <Box>
                  {section.items.map((entry) =>
                    entry.kind === 'leaf'
                      ? renderNavLeaf(entry.leaf)
                      : renderNavGroup(entry),
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
