import React from 'react';
import { Link } from 'react-router-dom';
import { useLandingI18n } from '../context/LandingI18nContext';

export const Footer: React.FC = () => {
  const { t } = useLandingI18n();

  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer-grid">
          {/* Brand */}
          <div>
            <Link to="/" className="landing-brand" style={{ marginBottom: '0.75rem' }}>
              <div className="landing-brand-mark">T</div>
              <span>TRANSIVO</span>
            </Link>
            <p style={{ color: 'var(--landing-text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
              {t.footer.tagline}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="landing-footer-col-title">{t.footer.product}</h4>
            <ul className="landing-footer-links">
              <li><a href="#hero" className="landing-footer-link">{t.header.home}</a></li>
              <li><a href="#why" className="landing-footer-link">{t.footer.solution}</a></li>
              <li><a href="#features" className="landing-footer-link">{t.footer.features}</a></li>
              <li><a href="#showcase" className="landing-footer-link">{t.footer.preview}</a></li>
            </ul>
          </div>

          {/* ERP Platform */}
          <div>
            <h4 className="landing-footer-col-title">{t.footer.company}</h4>
            <ul className="landing-footer-links">
              <li><Link to="/login" className="landing-footer-link">{t.header.login}</Link></li>
              <li><Link to="/app" className="landing-footer-link">{t.header.appDashboard}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="landing-footer-col-title">{t.footer.legal}</h4>
            <ul className="landing-footer-links">
              <li><a href="#hero" className="landing-footer-link">{t.footer.terms}</a></li>
              <li><a href="#hero" className="landing-footer-link">{t.footer.privacy}</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="landing-footer-bottom">
          <div>{t.footer.copyright}</div>
          <div>transivo.tech</div>
        </div>
      </div>
    </footer>
  );
};
