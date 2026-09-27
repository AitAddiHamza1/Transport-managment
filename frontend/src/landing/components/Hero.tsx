import React from 'react';
import { Link } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LoginIcon from '@mui/icons-material/Login';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RouteIcon from '@mui/icons-material/Route';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLandingI18n } from '../context/LandingI18nContext';

export const Hero: React.FC = () => {
  const { t } = useLandingI18n();

  return (
    <section id="hero" className="landing-hero">
      <div className="landing-container">
        <div className="landing-hero-grid">
          {/* Left Editorial Copy Column */}
          <div>
            <span className="landing-eyebrow">{t.hero.badge}</span>
            <h1 className="landing-hero-title">{t.hero.title}</h1>
            <p className="landing-hero-desc">{t.hero.description}</p>

            <div className="landing-hero-actions">
              <a href="#showcase" className="landing-btn landing-btn-primary">
                <span>{t.hero.primaryCta}</span>
                <ArrowForwardIcon style={{ fontSize: 16 }} />
              </a>
              <Link to="/login" className="landing-btn landing-btn-secondary">
                <LoginIcon style={{ fontSize: 16 }} />
                <span>{t.hero.secondaryCta}</span>
              </Link>
            </div>

            {/* Structured Value Points */}
            <div className="landing-hero-highlights">
              <div>
                <div className="landing-highlight-title">{t.hero.stats.centralized}</div>
                <div className="landing-highlight-desc">{t.hero.stats.centralizedDesc}</div>
              </div>
              <div>
                <div className="landing-highlight-title">{t.hero.stats.realtime}</div>
                <div className="landing-highlight-desc">{t.hero.stats.realtimeDesc}</div>
              </div>
              <div>
                <div className="landing-highlight-title">{t.hero.stats.security}</div>
                <div className="landing-highlight-desc">{t.hero.stats.securityDesc}</div>
              </div>
            </div>
          </div>

          {/* Right Product Interface Visual */}
          <div className="landing-product-frame">
            <div className="landing-product-topbar">
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--landing-text-muted)' }}>
                TRANSIVO ERP — Espace Exploitation & Flotte
              </span>
            </div>

            <div className="landing-product-body">
              {/* Top Operational Status Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--landing-bg-alt)',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--landing-border)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--landing-text-muted)' }}>
                    Missions & Trajets
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.2rem' }}>
                    Suivi Opérationnel
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--landing-bg-alt)',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--landing-border)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--landing-text-muted)' }}>
                    Disponibilité Flotte
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.2rem' }}>
                    Parc Automobile
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--landing-bg-alt)',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--landing-border)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--landing-text-muted)' }}>
                    Conformité Doc
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.2rem', color: 'var(--landing-accent)' }}>
                    Alertes Échéances
                  </div>
                </div>
              </div>

              {/* Realistic ERP Dispatch Table Overview */}
              <div
                style={{
                  backgroundColor: 'var(--landing-bg-alt)',
                  borderRadius: '8px',
                  border: '1px solid var(--landing-border)',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RouteIcon style={{ fontSize: 16, color: 'var(--landing-accent)' }} />
                    Dernières Missions Planifiées
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--landing-accent)',
                      fontWeight: 600,
                    }}
                  >
                    Mise à jour en temps réel
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem' }}>
                  {[
                    { ref: 'VY-2026-042', route: 'Ligne Tanger Port ➔ Casablanca', status: 'En cours', color: 'var(--landing-accent)' },
                    { ref: 'VY-2026-041', route: 'Ligne Agadir ➔ Algeciras (Fret Maritime)', status: 'Traversée', color: '#3B82F6' },
                    { ref: 'VY-2026-040', route: 'Ligne Marrakech ➔ Oujda', status: 'Terminé', color: '#10B981' },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0',
                        borderBottom: idx < 2 ? '1px solid var(--landing-border)' : 'none',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, marginRight: '0.5rem' }}>{row.ref}</span>
                        <span style={{ color: 'var(--landing-text-muted)' }}>{row.route}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          color: row.color,
                          backgroundColor: 'var(--landing-surface)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid var(--landing-border)',
                        }}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
