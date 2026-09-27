import React from 'react';
import { useLandingI18n } from '../context/LandingI18nContext';

export const WhyTransivo: React.FC = () => {
  const { t } = useLandingI18n();

  const concepts = [
    t.why.concepts.operations,
    t.why.concepts.management,
    t.why.concepts.finance,
  ];

  return (
    <section id="why" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-why-grid">
          {/* Left Editorial Text Column */}
          <div>
            <span className="landing-eyebrow">{t.why.eyebrow}</span>
            <h2 className="landing-section-title">{t.why.title}</h2>
            <p className="landing-section-subtitle" style={{ marginBottom: 0 }}>
              {t.why.subtitle}
            </p>
          </div>

          {/* Right Structured System Concepts */}
          <div className="landing-why-list">
            {concepts.map((concept, idx) => (
              <div key={idx} className="landing-why-item">
                <div className="landing-why-item-header">
                  <span className="landing-why-item-title">{concept.title}</span>
                  <span className="landing-why-item-sub">{concept.subtitle}</span>
                </div>
                <p className="landing-why-item-desc">{concept.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
