import React, { useState, useRef, useEffect } from 'react';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import { useLandingI18n } from '../context/LandingI18nContext';
import { LandingLanguage } from '../i18n/types';

interface LanguageOption {
  code: LandingLanguage;
  label: string;
  nativeName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'ar', label: 'AR', nativeName: 'العربية' },
  { code: 'fr', label: 'FR', nativeName: 'Français' },
  { code: 'en', label: 'EN', nativeName: 'English' },
];

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLandingI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: LandingLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="transivo-lang-selector-wrap" ref={containerRef}>
      <button
        type="button"
        className={`transivo-lang-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Langue / Language (actuel: ${language.toUpperCase()})`}
      >
        <LanguageIcon className="lang-globe-icon" style={{ fontSize: 15 }} />
        <span className="lang-active-code">{language.toUpperCase()}</span>
        <KeyboardArrowDownIcon
          className={`lang-chevron-icon ${isOpen ? 'chevron-rotated' : ''}`}
          style={{ fontSize: 14 }}
        />
      </button>

      {isOpen && (
        <div
          className="transivo-lang-dropdown"
          role="listbox"
          aria-label="Sélectionner la langue / Select language"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`transivo-lang-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelect(lang.code)}
              >
                <span className="lang-opt-code">{lang.label}</span>
                <span className="lang-opt-name">{lang.nativeName}</span>
                {isSelected && <CheckIcon className="lang-opt-check" style={{ fontSize: 14 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

