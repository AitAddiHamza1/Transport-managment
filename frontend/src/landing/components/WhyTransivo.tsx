import React from 'react';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import { useLandingI18n } from '../context/LandingI18nContext';

export const WhyTransivo: React.FC = () => {
  const { t } = useLandingI18n();

  const benefitCards = [
    {
      key: 'ops',
      icon: <TrackChangesOutlinedIcon style={{ fontSize: 32 }} />,
      data: t.benefits.items.ops,
    },
    {
      key: 'profit',
      icon: <TrendingUpOutlinedIcon style={{ fontSize: 32 }} />,
      data: t.benefits.items.profit,
    },
    {
      key: 'time',
      icon: <AccessTimeOutlinedIcon style={{ fontSize: 32 }} />,
      data: t.benefits.items.time,
    },
    {
      key: 'support',
      icon: <SupportAgentOutlinedIcon style={{ fontSize: 32 }} />,
      data: t.benefits.items.support,
    },
  ];

  const trustPillars = [
    {
      icon: <HubOutlinedIcon style={{ fontSize: 24, color: 'var(--transivo-cyan)' }} />,
      title: t.trustBanner.p1,
      desc: t.trustBanner.p1Desc,
    },
    {
      icon: <FactCheckOutlinedIcon style={{ fontSize: 24, color: 'var(--transivo-cyan)' }} />,
      title: t.trustBanner.p2,
      desc: t.trustBanner.p2Desc,
    },
    {
      icon: <SecurityOutlinedIcon style={{ fontSize: 24, color: 'var(--transivo-cyan)' }} />,
      title: t.trustBanner.p3,
      desc: t.trustBanner.p3Desc,
    },
    {
      icon: <CloudDoneOutlinedIcon style={{ fontSize: 24, color: 'var(--transivo-cyan)' }} />,
      title: t.trustBanner.p4,
      desc: t.trustBanner.p4Desc,
    },
  ];

  return (
    <section id="benefits" className="transivo-section transivo-benefits-section">
      <div className="landing-container">
        {/* Header */}
        <div className="transivo-section-header text-center">
          <span className="transivo-section-badge">{t.benefits.eyebrow}</span>
          <h2 className="transivo-section-title">{t.benefits.title}</h2>
          <p className="transivo-section-subtitle">{t.benefits.subtitle}</p>
        </div>

        {/* 4 Cards Grid */}
        <div className="transivo-benefits-grid">
          {benefitCards.map((card) => (
            <div key={card.key} className="transivo-benefit-card">
              <div className="benefit-icon-box" aria-hidden="true">
                {card.icon}
              </div>
              <h3 className="benefit-title">{card.data.title}</h3>
              <p className="benefit-desc">{card.data.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Trust Banner */}
      <div className="transivo-trust-banner">
        <div className="trust-banner-overlay" aria-hidden="true" />
        <div className="landing-container trust-banner-container">
          <div className="trust-banner-header text-center">
            <span className="trust-eyebrow">{t.trustBanner.eyebrow}</span>
            <h3 className="trust-title">{t.trustBanner.title}</h3>
          </div>

          <div className="trust-pillars-grid">
            {trustPillars.map((pillar, idx) => (
              <div key={idx} className="trust-pillar-card">
                <div className="trust-icon-wrap" aria-hidden="true">
                  {pillar.icon}
                </div>
                <div className="trust-pillar-title">{pillar.title}</div>
                <div className="trust-pillar-desc">{pillar.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyTransivo;
