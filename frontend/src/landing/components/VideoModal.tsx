import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { useLandingI18n } from '../context/LandingI18nContext';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoUrl }) => {
  const { t } = useLandingI18n();

  if (!isOpen) return null;

  return (
    <div className="transivo-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="transivo-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="transivo-modal-header">
          <div>
            <h3 className="transivo-modal-title">{t.preview.videoModal.title}</h3>
            <p className="transivo-modal-sub">{t.preview.videoModal.subtitle}</p>
          </div>
          <button
            className="transivo-modal-close"
            onClick={onClose}
            aria-label={t.preview.videoModal.close}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Video Area / Future Ready Slot */}
        <div className="transivo-video-frame">
          {videoUrl ? (
            <iframe
              src={videoUrl}
              title="Transivo ERP Video"
              className="transivo-video-iframe"
              allowFullScreen
            />
          ) : (
            <div className="transivo-video-placeholder">
              <div className="video-placeholder-glow" />
              <div className="video-placeholder-icon">
                <OndemandVideoIcon style={{ fontSize: 56, color: 'var(--transivo-cyan)' }} />
              </div>
              <span className="video-badge">{t.preview.videoModal.comingSoon}</span>
              <p className="video-desc">{t.preview.videoModal.desc}</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="transivo-modal-actions">
          <a
            href="#contact"
            className="landing-btn landing-btn-primary"
            onClick={onClose}
          >
            <PhoneInTalkIcon style={{ fontSize: 18 }} />
            <span>{t.preview.videoModal.contactBtn}</span>
          </a>
          <button className="landing-btn landing-btn-secondary" onClick={onClose}>
            {t.preview.videoModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
