import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

declare module '@mui/material/styles' {
  interface Theme {
    customColors: typeof tokens.customColors;
    customRadii: typeof tokens.customRadii;
    customShadows: typeof tokens.customShadows;
    customTransitions: typeof tokens.customTransitions;
  }
  interface ThemeOptions {
    customColors?: typeof tokens.customColors;
    customRadii?: typeof tokens.customRadii;
    customShadows?: typeof tokens.customShadows;
    customTransitions?: typeof tokens.customTransitions;
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
  customTransitions: tokens.customTransitions,
  
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
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 }, // Page Title
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },  // Section Title
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },       // Card Title
    subtitle1: { fontSize: '1rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.57 }, // ERP standard body text
    body2: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.66 },  // Secondary body text
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontSize: '0.75rem', fontWeight: 400 },
    overline: { fontSize: '0.675rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
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
          borderRadius: 8, // Rounded button (between small and medium)
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
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
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: tokens.palette.primary.main,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderColor: tokens.palette.divider,
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 600,
          backgroundColor: tokens.palette.background.default,
          color: tokens.palette.text.primary,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.customRadii.small,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.customRadii.large,
          boxShadow: tokens.customShadows.floating,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '24px 24px 16px 24px',
          fontSize: '1.125rem',
          fontWeight: 600,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px 24px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px 24px',
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
