import React from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useLandingTheme } from '../context/LandingThemeContext';

export const ThemeToggle: React.FC = () => {
  const { themeMode, toggleTheme } = useLandingTheme();

  return (
    <button
      className="landing-icon-btn"
      onClick={toggleTheme}
      aria-label={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}
      title={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}
    >
      {themeMode === 'dark' ? (
        <LightModeIcon style={{ fontSize: 18 }} />
      ) : (
        <DarkModeIcon style={{ fontSize: 18 }} />
      )}
    </button>
  );
};
