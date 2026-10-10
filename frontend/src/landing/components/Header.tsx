import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLandingI18n } from '../context/LandingI18nContext';
import { TransivoLogo } from './TransivoLogo';
import { LanguageSelector } from './LanguageSelector';
import { useAuth } from '../../features/auth/useAuth';

export const Header: React.FC = () => {
  const { t } = useLandingI18n();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`transivo-header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="landing-container">
        <div className="transivo-header-content">
          {/* Brand Logo with authentic stylized T */}
          <Link to="/" className="transivo-brand-link" onClick={closeMenu} aria-label="Transivo ERP">
            <TransivoLogo size={34} showText={true} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="transivo-nav-desktop" aria-label="Navigation principale">
            <a href="#hero" className="transivo-nav-link">
              {t.header.home}
            </a>
            <a href="#features" className="transivo-nav-link">
              {t.header.features}
            </a>
            <a href="#benefits" className="transivo-nav-link">
              {t.header.benefits}
            </a>
            <a href="#preview" className="transivo-nav-link">
              {t.header.preview}
            </a>
            <a href="#contact" className="transivo-nav-link">
              {t.header.contact}
            </a>
          </nav>

          {/* Actions & Language */}
          <div className="transivo-header-actions">
            <div className="header-lang-desktop">
              <LanguageSelector />
            </div>

            {/* ERP access link */}
            <div className="header-login-desktop">
              {isAuthenticated ? (
                <Link to="/app" className="transivo-btn-subtle" title={t.header.dashboard}>
                  <DashboardIcon style={{ fontSize: 16 }} />
                  <span>{t.header.dashboard}</span>
                </Link>
              ) : (
                <Link to="/login" className="transivo-btn-subtle" title={t.header.login}>
                  <LoginIcon style={{ fontSize: 16 }} />
                  <span>{t.header.login}</span>
                </Link>
              )}
            </div>

            {/* Primary CTA */}
            <a href="#contact" className="transivo-btn-cta">
              <span>{t.header.contactCta}</span>
              <ArrowForwardIcon className="rtl-mirror" style={{ fontSize: 15 }} />
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              className="transivo-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`transivo-mobile-drawer ${mobileMenuOpen ? 'drawer-open' : ''}`}>
        <div className="mobile-drawer-inner">
          <nav className="transivo-nav-mobile" aria-label="Navigation mobile">
            <a href="#hero" className="transivo-mobile-link" onClick={closeMenu}>
              {t.header.home}
            </a>
            <a href="#features" className="transivo-mobile-link" onClick={closeMenu}>
              {t.header.features}
            </a>
            <a href="#benefits" className="transivo-mobile-link" onClick={closeMenu}>
              {t.header.benefits}
            </a>
            <a href="#preview" className="transivo-mobile-link" onClick={closeMenu}>
              {t.header.preview}
            </a>
            <a href="#contact" className="transivo-mobile-link" onClick={closeMenu}>
              {t.header.contact}
            </a>
          </nav>

          <div className="mobile-drawer-bottom">
            <LanguageSelector />

            <div className="mobile-btn-group">
              {isAuthenticated ? (
                <Link to="/app" className="landing-btn landing-btn-secondary w-full" onClick={closeMenu}>
                  <DashboardIcon style={{ fontSize: 18 }} />
                  <span>{t.header.dashboard}</span>
                </Link>
              ) : (
                <Link to="/login" className="landing-btn landing-btn-secondary w-full" onClick={closeMenu}>
                  <LoginIcon style={{ fontSize: 18 }} />
                  <span>{t.header.login}</span>
                </Link>
              )}

              <a href="#contact" className="landing-btn landing-btn-primary w-full" onClick={closeMenu}>
                <span>{t.header.contactCta}</span>
                <ArrowForwardIcon className="rtl-mirror" style={{ fontSize: 16 }} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
