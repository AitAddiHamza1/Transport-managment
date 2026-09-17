/**
 * Design tokens for the Transport Management ERP visual identity.
 * Contains central definition of colors, typography, spacing, border radii, and shadows.
 */
export const tokens = {
  palette: {
    primary: {
      main: '#14B8A6', // Turquoise/teal accent
      light: '#2DD4BF',
      dark: '#0F766E',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E08A1E', // Amber secondary accent
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F7FB', // Light gray-blue app workspace background
      paper: '#FFFFFF',   // White card/dialog content surfaces
    },
    text: {
      primary: '#0F172A',   // Slate-900 / dark navy/charcoal for readability
      secondary: '#475569', // Slate-600 / neutral gray
      disabled: '#94A3B8',  // Slate-400 / light gray
    },
    divider: '#E2E8F0', // Slate-200 / light border color
    success: { main: '#10B981' }, // Emerald-500
    warning: { main: '#F59E0B' }, // Amber-500
    error: { main: '#EF4444' },   // Red-500
    info: { main: '#3B82F6' },    // Blue-500
  },
  customColors: {
    sidebarBackground: '#111827', // Slate-900 (Dark navy sidebar)
    sidebarSurface: '#182334',    // Slate-800 (Secondary surface for items/groups/popovers)
    sidebarHoverBackground: 'rgba(255, 255, 255, 0.06)', // Lighter navy overlay on hover
    sidebarSelectedBackground: '#1F2937', // Premium restrained active background (subtle navy)
    sidebarSelectedHoverBackground: 'rgba(255, 255, 255, 0.12)', // Intensified selected bg on hover
    sidebarText: '#FFFFFF',       // Clean white for active/hover text
    sidebarMutedText: '#9CA3AF',  // Slate-400 for default text
    sidebarIcon: '#9CA3AF',       // Slate-400 default icon
    sidebarBorder: 'rgba(255, 255, 255, 0.08)', // Separator line color
    sidebarDisabledText: 'rgba(255, 255, 255, 0.3)', // Disabled item text
    sidebarDisabledIcon: 'rgba(255, 255, 255, 0.2)', // Disabled item icon
    appBackground: '#F4F7FB',     // Workspace background
    surfaceElevated: '#FFFFFF',   // Elevated surfaces
    borderStrong: '#CBD5E1',      // Slate-300 strong/hover border
    statCardIconForeground: '#FFFFFF', // Design System token for StatCard white icons
  },
  statusTints: {
    success: {
      bg: '#ECFDF5',  // Soft emerald background
      text: '#047857', // High contrast emerald text
    },
    warning: {
      bg: '#FEF3C7',  // Soft amber background
      text: '#B45309', // High contrast amber text
    },
    error: {
      bg: '#FEE2E2',  // Soft red background
      text: '#B91C1C', // High contrast red text
    },
    info: {
      bg: '#EFF6FF',  // Soft blue background
      text: '#1D4ED8', // High contrast blue text
    },
  },
  customSpacing: {
    xs: 4,   // Micro gaps (badge inline elements, icon-text gap)
    sm: 8,   // Dense control spacing (button groups, filter gaps)
    md: 12,  // Standard component internal padding / row gaps
    lg: 16,  // Card padding, filter bar container padding, section gaps
    xl: 20,  // Workspace padding, modal padding
    xxl: 24, // Major section separation limit
  },
  customRadii: {
    small: 6,
    medium: 8,   // Approved medium border radius for cards/tables/buttons
    large: 12,   // Approved modal dialog radius
    pill: '9999px',
  },
  customShadows: {
    none: 'none',
    subtle: '0px 1px 2px 0px rgba(15, 23, 42, 0.05)',
    card: '0px 1px 3px 0px rgba(15, 23, 42, 0.06), 0px 1px 2px -1px rgba(15, 23, 42, 0.04)',
    floating: '0px 10px 15px -3px rgba(15, 23, 42, 0.08), 0px 4px 6px -4px rgba(15, 23, 42, 0.04)',
  },
  customTransitions: {
    durationFast: 150,
    durationNormal: 250,
    durationSlow: 350,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

