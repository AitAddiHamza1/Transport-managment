import React from 'react';
import RouteIcon from '@mui/icons-material/Route';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLandingI18n } from '../context/LandingI18nContext';

export const ProductShowcase: React.FC = () => {
  const { t } = useLandingI18n();

  return (
    <section id="showcase" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-section-header" style={{ textAlign: 'center', margin: '0 auto 4rem auto' }}>
          <span className="landing-eyebrow">{t.showcase.eyebrow}</span>
          <h2 className="landing-section-title">{t.showcase.title}</h2>
          <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>
            {t.showcase.subtitle}
          </p>
        </div>

        <div className="landing-showcase-blocks">
          {/* Alternating Block 1: Text Left / Product View Right */}
          <div className="landing-showcase-row">
            <div>
              <span className="landing-showcase-tag">{t.showcase.block1.tag}</span>
              <h3 className="landing-showcase-title">{t.showcase.block1.title}</h3>
              <p className="landing-showcase-desc">{t.showcase.block1.desc}</p>
            </div>

            <div className="landing-product-frame">
              <div className="landing-product-topbar">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--landing-text-muted)' }}>
                  TRANSIVO — Module Voyages & Planification
                </span>
              </div>
              <div className="landing-product-body">
                <div style={{ backgroundColor: 'var(--landing-bg)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--landing-border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RouteIcon style={{ fontSize: 16, color: 'var(--landing-accent)' }} />
                    Détail du Voyage #VY-2026-042
                  </div>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--landing-text-muted)' }}>Trajet:</span>
                      <span style={{ fontWeight: 600 }}>Tanger Port ➔ Casablanca (Zone Industrielle)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--landing-text-muted)' }}>Chauffeur & Ensemble:</span>
                      <span style={{ fontWeight: 600 }}>K. Bennani — Tracteur Volvo FH16</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--landing-text-muted)' }}>Statut du Chargement:</span>
                      <span style={{ color: 'var(--landing-accent)', fontWeight: 700 }}>En Route (Départ valider à 08:30)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternating Block 2: Product View Left / Text Right */}
          <div className="landing-showcase-row">
            <div className="landing-product-frame">
              <div className="landing-product-topbar">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--landing-text-muted)' }}>
                  TRANSIVO — Registre de Flotte & Documents
                </span>
              </div>
              <div className="landing-product-body">
                <div style={{ backgroundColor: 'var(--landing-bg)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--landing-border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <LocalShippingIcon style={{ fontSize: 16, color: 'var(--landing-accent)' }} />
                    Véhicule: Tracteur Routier (12480-A-1)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Carte Grise & Immatriculation</span>
                      <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <CheckCircleIcon style={{ fontSize: 14 }} /> Conforme
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Assurance Transporteur</span>
                      <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <CheckCircleIcon style={{ fontSize: 14 }} /> Valide
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Visite Technique Préventive</span>
                      <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <CheckCircleIcon style={{ fontSize: 14 }} /> À jour
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="landing-showcase-tag">{t.showcase.block2.tag}</span>
              <h3 className="landing-showcase-title">{t.showcase.block2.title}</h3>
              <p className="landing-showcase-desc">{t.showcase.block2.desc}</p>
            </div>
          </div>

          {/* Alternating Block 3: Text Left / Product View Right */}
          <div className="landing-showcase-row">
            <div>
              <span className="landing-showcase-tag">{t.showcase.block3.tag}</span>
              <h3 className="landing-showcase-title">{t.showcase.block3.title}</h3>
              <p className="landing-showcase-desc">{t.showcase.block3.desc}</p>
            </div>

            <div className="landing-product-frame">
              <div className="landing-product-topbar">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--landing-text-muted)' }}>
                  TRANSIVO — Facturation & Stock Carburant
                </span>
              </div>
              <div className="landing-product-body">
                <div style={{ backgroundColor: 'var(--landing-bg)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--landing-border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ReceiptIcon style={{ fontSize: 16, color: 'var(--landing-accent)' }} />
                    Facture #FC-2026-112 & Bons Gasoil
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <div style={{ backgroundColor: 'var(--landing-surface)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--landing-border)' }}>
                      <div style={{ color: 'var(--landing-text-muted)', fontSize: '0.75rem' }}>Client</div>
                      <div style={{ fontWeight: 600 }}>Trans-Logistique Maroc</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--landing-surface)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--landing-border)' }}>
                      <div style={{ color: 'var(--landing-text-muted)', fontSize: '0.75rem' }}>Statut Facture</div>
                      <div style={{ fontWeight: 700, color: 'var(--landing-accent)' }}>Validée / Émise</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
