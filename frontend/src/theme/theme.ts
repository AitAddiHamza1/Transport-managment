import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

declare module '@mui/material/styles' {
  interface Theme {
    customColors: typeof tokens.customColors;
    customRadii: typeof tokens.customRadii;
    customShadows: typeof tokens.customShadows;
    customSpacing: typeof tokens.customSpacing;
    customTransitions: typeof tokens.customTransitions;
    statusTints: typeof tokens.statusTints;
  }
  interface ThemeOptions {
    customColors?: typeof tokens.customColors;
    customRadii?: typeof tokens.customRadii;
    customShadows?: typeof tokens.customShadows;
    customSpacing?: typeof tokens.customSpacing;
    customTransitions?: typeof tokens.customTransitions;
    statusTints?: typeof tokens.statusTints;
  }
}

/**
 * Centered Material UI theme mapping tokens to MUI components and custom parameters.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: tokens.palette.primary,
    secondary: tokens.palette.secondary,
    background: tokens.palette.background,
    text: tokens.palette.text,
    divider: tokens.palette.divider,
    success: tokens.palette.success,
    warning: tokens.palette.warning,
    error: tokens.palette.error,
    info: tokens.palette.info,
  },
  shape: {
    borderRadius: tokens.customRadii.medium,
  },
  // Mapping custom tokens namespace to theme object
  customColors: tokens.customColors,
  customRadii: tokens.customRadii,
  customShadows: tokens.customShadows,
  customSpacing: tokens.customSpacing,
  customTransitions: tokens.customTransitions,
  statusTints: tokens.statusTints,
  
  // Customizing standard MUI shadow array with our soft shadows
  shadows: [
    tokens.customShadows.none,    // elevation 0
    tokens.customShadows.subtle,  // elevation 1
    tokens.customShadows.card,    // elevation 2
    ...Array(22).fill(tokens.customShadows.floating), // elevation 3-24 (floating elevation styles)
  ] as any,

  typography: {
    fontFamily: ['Inter', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
    h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }, // Page Title (22px / 700 / 1.2)
    h5: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.25 }, // Section Title (17px / 600 / 1.25)
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 },       // Card / Block Title (16px / 600 / 1.3)
    subtitle1: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.4 }, // Subtitle / Descriptor (13px / 400 / 1.4)
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.35 },    // Standard Body text (14px / 400 / 1.35)
    body2: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.3 },      // Secondary body text (12px / 400 / 1.3)
    button: { fontSize: '0.875rem', textTransform: 'none', fontWeight: 600, lineHeight: 1.2 }, // Button text (14px / 600)
    caption: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 },    // KPI Label / Caption (12px / 500)
    overline: { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'none', letterSpacing: '0.03em' },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.palette.background.default,
          color: tokens.palette.text.primary,
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(15, 23, 42, 0.1)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(15, 23, 42, 0.2)',
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '10ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '10ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: tokens.customRadii.medium,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '6px 14px',
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          backgroundColor: tokens.palette.primary.main,
          color: tokens.palette.primary.contrastText,
          '&:hover': {
            backgroundColor: tokens.palette.primary.dark,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.customRadii.medium,
          boxShadow: tokens.customShadows.card,
          border: `1px solid ${tokens.palette.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.customRadii.small,
          fontSize: '0.875rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.palette.divider,
            transition: 'border-color 0.2s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.customColors.borderStrong,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.palette.primary.main,
            borderWidth: '1px',
          },
        },
        inputSizeSmall: {
          padding: '8px 12px',
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          fontWeight: 500,
          '&.Mui-focused': {
            color: tokens.palette.primary.main,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 12px',
          borderColor: tokens.palette.divider,
          fontSize: '0.875rem',
          lineHeight: 1.35,
        },
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          lineHeight: 1.2,
          backgroundColor: '#F8FAFC',
          color: tokens.palette.text.primary,
          borderBottom: `1px solid ${tokens.palette.divider}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.customRadii.small,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.customRadii.large,
          boxShadow: tokens.customShadows.floating,
          '@media (max-width:600px)': {
            margin: '12px',
            width: 'calc(100% - 24px)',
            maxWidth: 'none !important',
            maxHeight: 'calc(100% - 24px)',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          fontSize: '1.0625rem',
          fontWeight: 600,
          '@media (max-width:600px)': {
            padding: '14px 16px',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 20px 20px 20px',
          '@media (max-width:600px)': {
            padding: '12px 14px 16px 14px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 20px 16px 20px',
          '@media (max-width:600px)': {
            padding: '12px 14px 14px 14px',
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: '#F1F5F9',
          borderRadius: tokens.customRadii.medium,
          padding: '2px',
          border: `1px solid ${tokens.palette.divider}`,
        },
        grouped: {
          border: 'none !important',
          borderRadius: `${tokens.customRadii.small}px !important`,
          margin: '0 2px',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          padding: '4px 14px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: tokens.palette.text.secondary,
          textTransform: 'none',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            backgroundColor: '#E2E8F0',
            color: tokens.palette.text.primary,
          },
          '&.Mui-selected': {
            backgroundColor: `${tokens.palette.primary.main} !important`,
            color: '#FFFFFF !important',
            fontWeight: 700,
            boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.1)',
            '&:hover': {
              backgroundColor: `${tokens.palette.primary.dark} !important`,
              color: '#FFFFFF !important',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.palette.background.paper,
          color: tokens.palette.text.primary,
          boxShadow: tokens.customShadows.subtle,
          borderBottom: `1px solid ${tokens.palette.divider}`,
        },
      },
    },
  },
});

