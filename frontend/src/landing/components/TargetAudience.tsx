import React from 'react';
import { useLandingI18n } from '../context/LandingI18nContext';

export const TargetAudience: React.FC = () => {
  const { t } = useLandingI18n();

  const profiles = [
    t.audience.transportCompanies,
    t.audience.freightHaulers,
    t.audience.fleetManagers,
    t.audience.operationsManagers,
  ];

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <h2 className="landing-section-title">{t.audience.title}</h2>
          <p className="landing-section-subtitle">{t.audience.subtitle}</p>
        </div>

        <div className="landing-audience-grid">
          {profiles.map((profile, idx) => (
            <div key={idx} className="landing-audience-card">
              <h3 className="landing-audience-title">{profile.title}</h3>
              <p className="landing-audience-desc">{profile.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
