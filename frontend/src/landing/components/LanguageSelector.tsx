import React from 'react';
import { useLandingI18n } from '../context/LandingI18nContext';
import { LandingLanguage } from '../i18n/types';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLandingI18n();

  return (
    <select
      className="landing-select"
      value={language}
      onChange={(e) => setLanguage(e.target.value as LandingLanguage)}
      aria-label="Sélectionner la langue"
    >
      <option value="fr">Français</option>
      <option value="en">English</option>
      <option value="ar">العربية</option>
    </select>
  );
};
