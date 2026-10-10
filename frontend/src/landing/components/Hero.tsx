import React, { useState } from 'react';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useLandingI18n } from '../context/LandingI18nContext';
import { VideoModal } from './VideoModal';

export const Hero: React.FC = () => {
  const { t, language } = useLandingI18n();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const whatsappUrl = 'https://wa.me/212720201139';

  return (
    <section id="hero" className="transivo-hero-section">
      {/* Dynamic Animated Logistics Background */}
      <div className="hero-bg-network" aria-hidden="true">
        <div className="network-glow glow-1" />
        <div className="network-glow glow-2" />

        {/* CSS Animated Logistics Route Lines */}
        <svg className="network-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#00D2BA" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="routeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#14B8A6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Logistics Route Trajectories */}
          <path className="route-path route-path-1" d="M -100 250 Q 400 120 750 340 T 1550 200" fill="none" stroke="url(#routeGrad1)" strokeWidth="2" />
          <path className="route-path route-path-2" d="M -100 480 Q 300 620 800 420 T 1550 520" fill="none" stroke="url(#routeGrad2)" strokeWidth="1.5" />
          <path className="route-path route-path-3" d="M 200 -50 Q 550 350 900 280 T 1500 750" fill="none" stroke="url(#routeGrad1)" strokeWidth="1.5" strokeDasharray="6 8" />

          {/* Animated Waypoint Pulses */}
          <circle className="waypoint-pulse wp-1" cx="400" cy="180" r="4" fill="#00E5FF" />
          <circle className="waypoint-pulse wp-2" cx="750" cy="340" r="5" fill="#5EEAD4" />
          <circle className="waypoint-pulse wp-3" cx="800" cy="420" r="4" fill="#14B8A6" />
          <circle className="waypoint-pulse wp-4" cx="1150" cy="270" r="5" fill="#00D2BA" />
        </svg>
      </div>

      <div className="landing-container hero-container">
        <div className="hero-grid">
          {/* Left Column: Headline, Description & CTAs */}
          <div className="hero-content">
            {/* Top Pill Tagline */}
            <div className="hero-eyebrow-pill">
              <span className="eyebrow-dot" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-title">
              {t.hero.titlePart1}
              <span className="hero-title-highlight">{t.hero.titleHighlight}</span>
              {t.hero.titlePart2}
            </h1>

            {/* Secondary Description */}
            <p className="hero-subtitle">{t.hero.subtitle}</p>

            {/* Action Buttons */}
            <div className="hero-actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn hero-btn-whatsapp"
                aria-label="Discuter sur WhatsApp au 0720201139"
              >
                <WhatsAppIcon style={{ fontSize: 22 }} />
                <span>{t.hero.ctaSecondary}</span>
              </a>

              <button
                type="button"
                className="landing-btn hero-btn-presentation"
                onClick={() => setVideoModalOpen(true)}
              >
                <PlayCircleOutlineIcon style={{ fontSize: 22, color: 'var(--transivo-cyan)' }} />
                <span>{t.hero.viewDemo}</span>
              </button>
            </div>

            {/* Feature Pills Row */}
            <div className="hero-feature-pills">
              <div className="hero-pill-item">
                <LocalShippingOutlinedIcon className="pill-icon" style={{ fontSize: 18 }} />
                <span>{t.hero.pills.simple}</span>
              </div>
              <div className="hero-pill-item">
                <VerifiedUserOutlinedIcon className="pill-icon" style={{ fontSize: 18 }} />
                <span>{t.hero.pills.secure}</span>
              </div>
              <div className="hero-pill-item">
                <TuneOutlinedIcon className="pill-icon" style={{ fontSize: 18 }} />
                <span>{t.hero.pills.adapted}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Truck on Highway */}
          <div className="hero-visual-wrapper">
            <div className="hero-visual-frame">
              {/* Truck on illuminated highway */}
              <img
                src="/hero-truck.png"
                alt="Flotte de transport routier Transivo circulant sur autoroute éclairée"
                className="hero-truck-image"
                loading="eager"
                width="680"
                height="450"
              />

              {/* Seamless gradient overlay blending into dark background */}
              <div className="hero-image-overlay" />

              {/* Floating tech badge */}
              <div className="hero-floating-quote">
                <span className="quote-spark" />
                <span className="quote-text">{t.hero.floatingTag}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Discreet Scroll Down Indicator */}
        <div className="hero-scroll-indicator">
          <a href="#features" className="scroll-indicator-link" aria-label="Défiler vers les fonctionnalités">
            <span className="scroll-mouse">
              <span className="scroll-wheel" />
            </span>
            <KeyboardArrowDownIcon className="scroll-arrow" style={{ fontSize: 20 }} />
          </a>
        </div>
      </div>

      {/* Video Presentation Modal */}
      <VideoModal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} />
    </section>
  );
};
