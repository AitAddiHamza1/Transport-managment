import React, { useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import { useLandingI18n } from '../context/LandingI18nContext';
import { VideoModal } from './VideoModal';

export const SoftwarePreview: React.FC = () => {
  const { t } = useLandingI18n();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const checklist = [
    t.preview.points.dashboard,
    t.preview.points.tripsFleet,
    t.preview.points.finance,
    t.preview.points.modernUi,
    t.preview.points.responsive,
  ];

  return (
    <section id="preview" className="transivo-section transivo-preview-section">
      <div className="landing-container">
        <div className="transivo-preview-grid">
          {/* Left Column: Text & Checklist */}
          <div className="preview-text-col">
            <span className="transivo-section-badge">{t.preview.eyebrow}</span>
            <h2 className="transivo-section-title">{t.preview.title}</h2>
            <p className="preview-section-desc">{t.preview.subtitle}</p>

            {/* Checklist */}
            <ul className="preview-checklist">
              {checklist.map((point, index) => (
                <li key={index} className="preview-check-item">
                  <CheckCircleIcon className="check-icon" style={{ fontSize: 20 }} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="preview-actions">
              <a href="#contact" className="landing-btn landing-btn-primary">
                <span>{t.preview.cta}</span>
                <ArrowForwardIcon className="rtl-mirror" style={{ fontSize: 16 }} />
              </a>

              <button
                type="button"
                className="landing-btn landing-btn-secondary"
                onClick={() => setVideoModalOpen(true)}
              >
                <PlayCircleOutlineIcon style={{ fontSize: 20, color: 'var(--transivo-cyan)' }} />
                <span>{t.preview.watchVideo}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Realistic Laptop & Mobile Mockup Frame */}
          <div className="preview-visual-col">
            <div className="preview-device-stage">
              <div className="preview-glow-backdrop" aria-hidden="true" />

              <div className="preview-image-container">
                <img
                  src="/software-preview.png"
                  alt="Aperçu du logiciel Transivo sur ordinateur portable et smartphone"
                  className="preview-mockup-image"
                  loading="lazy"
                  width="700"
                  height="460"
                />

                {/* Floating Metric 1 */}
                <div className="floating-metric-badge badge-top-right">
                  <SpeedIcon style={{ fontSize: 16, color: 'var(--transivo-cyan)' }} />
                  <div>
                    <div className="badge-title">Temps réel</div>
                    <div className="badge-sub">Données synchronisées</div>
                  </div>
                </div>

                {/* Floating Metric 2 */}
                <div className="floating-metric-badge badge-bottom-left">
                  <DevicesOutlinedIcon style={{ fontSize: 16, color: 'var(--transivo-cyan)' }} />
                  <div>
                    <div className="badge-title">Multi-supports</div>
                    <div className="badge-sub">Web & Mobile responsive</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Presentation Modal */}
      <VideoModal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} />
    </section>
  );
};

export default SoftwarePreview;
