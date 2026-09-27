import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LoginIcon from '@mui/icons-material/Login';
import CloseIcon from '@mui/icons-material/Close';
import { useLandingI18n } from '../context/LandingI18nContext';

export const CtaSection: React.FC = () => {
  const { t } = useLandingI18n();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section id="contact" className="landing-section">
      <div className="landing-container">
        <div className="landing-cta-card">
          <h2 className="landing-cta-title">{t.cta.title}</h2>
          <p className="landing-cta-desc">{t.cta.subtitle}</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="landing-btn landing-btn-primary" onClick={() => setModalOpen(true)}>
              <span>{t.cta.demoButton}</span>
            </button>

            <Link to="/login" className="landing-btn landing-btn-secondary">
              <LoginIcon style={{ fontSize: 16 }} />
              <span>{t.cta.loginButton}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Demo Contact Information Modal */}
      {modalOpen && (
        <div className="landing-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="landing-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{t.cta.demoModalTitle}</h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--landing-text)', cursor: 'pointer' }}
                aria-label="Fermer"
              >
                <CloseIcon />
              </button>
            </div>

            <p style={{ color: 'var(--landing-text-muted)', fontSize: '0.925rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {t.cta.demoModalDesc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="landing-btn landing-btn-secondary" onClick={() => setModalOpen(false)}>
                {t.cta.close}
              </button>
              <Link to="/login" className="landing-btn landing-btn-primary" onClick={() => setModalOpen(false)}>
                <span>{t.cta.loginButton}</span>
                <ArrowForwardIcon style={{ fontSize: 16 }} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
