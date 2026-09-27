import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useLandingI18n } from '../context/LandingI18nContext';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../features/auth/useAuth';

export const Header: React.FC = () => {
  const { t } = useLandingI18n();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="landing-header">
      <div className="landing-container">
        <div className="landing-header-content">
          {/* Brand Logo */}
          <Link to="/" className="landing-brand" onClick={closeMenu}>
            <div className="landing-brand-mark">T</div>
            <span>TRANSIVO</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="landing-nav-desktop">
            <a href="#hero" className="landing-nav-link">
              {t.header.home}
            </a>
            <a href="#why" className="landing-nav-link">
              {t.header.solution}
            </a>
            <a href="#features" className="landing-nav-link">
              {t.header.features}
            </a>
            <a href="#showcase" className="landing-nav-link">
              {t.header.preview}
            </a>
            <a href="#contact" className="landing-nav-link">
              {t.header.contact}
            </a>
          </nav>

          {/* Right Controls */}
          <div className="landing-nav-actions">
            <LanguageSelector />
            <ThemeToggle />

            {isAuthenticated ? (
              <Link to="/app" className="landing-btn landing-btn-primary">
                <DashboardIcon style={{ fontSize: 16 }} />
                <span>{t.header.appDashboard}</span>
              </Link>
            ) : (
              <Link to="/login" className="landing-btn landing-btn-primary">
                <LoginIcon style={{ fontSize: 16 }} />
                <span>{t.header.login}</span>
              </Link>
            )}

            <button
              className="landing-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div className={`landing-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#hero" className="landing-mobile-nav-link" onClick={closeMenu}>
          {t.header.home}
        </a>
        <a href="#why" className="landing-mobile-nav-link" onClick={closeMenu}>
          {t.header.solution}
        </a>
        <a href="#features" className="landing-mobile-nav-link" onClick={closeMenu}>
          {t.header.features}
        </a>
        <a href="#showcase" className="landing-mobile-nav-link" onClick={closeMenu}>
          {t.header.preview}
        </a>
        <a href="#contact" className="landing-mobile-nav-link" onClick={closeMenu}>
          {t.header.contact}
        </a>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <LanguageSelector />
            <ThemeToggle />
          </div>
          {isAuthenticated ? (
            <Link to="/app" className="landing-btn landing-btn-primary" onClick={closeMenu}>
              <DashboardIcon style={{ fontSize: 16 }} />
              <span>{t.header.appDashboard}</span>
            </Link>
          ) : (
            <Link to="/login" className="landing-btn landing-btn-primary" onClick={closeMenu}>
              <LoginIcon style={{ fontSize: 16 }} />
              <span>{t.header.login}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
