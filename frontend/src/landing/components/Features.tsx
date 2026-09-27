import React, { useState } from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLandingI18n } from '../context/LandingI18nContext';

export const Features: React.FC = () => {
  const { t } = useLandingI18n();
  const [activeCategory, setActiveCategory] = useState<'operations' | 'management' | 'finance'>('operations');

  const operationsList = [
    t.features.operations.vehicles,
    t.features.operations.trips,
    t.features.operations.drivers,
    t.features.operations.crossings,
  ];

  const managementList = [
    t.features.management.clients,
    t.features.management.suppliers,
    t.features.management.employees,
    t.features.management.maintenance,
    t.features.management.documents,
  ];

  const financeList = [
    t.features.finance.invoicing,
    t.features.finance.payments,
    t.features.finance.expenses,
    t.features.finance.fuel,
    t.features.finance.debts,
  ];

  const getActiveList = () => {
    switch (activeCategory) {
      case 'operations': return operationsList;
      case 'management': return managementList;
      case 'finance': return financeList;
      default: return operationsList;
    }
  };

  return (
    <section id="features" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <h2 className="landing-section-title">{t.features.title}</h2>
          <p className="landing-section-subtitle">{t.features.subtitle}</p>
        </div>

        <div className="landing-features-layout">
          {/* Left Vertical Category Navigation */}
          <div className="landing-features-sidebar">
            <button
              className={`landing-cat-btn ${activeCategory === 'operations' ? 'active' : ''}`}
              onClick={() => setActiveCategory('operations')}
            >
              <span>{t.features.categories.operations}</span>
              <ArrowForwardIcon style={{ fontSize: 16 }} />
            </button>
            <button
              className={`landing-cat-btn ${activeCategory === 'management' ? 'active' : ''}`}
              onClick={() => setActiveCategory('management')}
            >
              <span>{t.features.categories.management}</span>
              <ArrowForwardIcon style={{ fontSize: 16 }} />
            </button>
            <button
              className={`landing-cat-btn ${activeCategory === 'finance' ? 'active' : ''}`}
              onClick={() => setActiveCategory('finance')}
            >
              <span>{t.features.categories.finance}</span>
              <ArrowForwardIcon style={{ fontSize: 16 }} />
            </button>
          </div>

          {/* Right Feature Panel */}
          <div className="landing-features-panel">
            <div className="landing-feature-grid">
              {getActiveList().map((item, idx) => (
                <div key={idx}>
                  <h3 className="landing-feature-block-title">{item.title}</h3>
                  <p className="landing-feature-block-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
