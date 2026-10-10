import React from 'react';
import RouteIcon from '@mui/icons-material/Route';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import DirectionsBoatFilledOutlinedIcon from '@mui/icons-material/DirectionsBoatFilledOutlined';
import LocalGasStationOutlinedIcon from '@mui/icons-material/LocalGasStationOutlined';
import { useLandingI18n } from '../context/LandingI18nContext';

export const Features: React.FC = () => {
  const { t } = useLandingI18n();

  const featureCards = [
    {
      key: 'trips',
      icon: <RouteIcon style={{ fontSize: 26 }} />,
      data: t.features.items.trips,
    },
    {
      key: 'fleet',
      icon: <LocalShippingIcon style={{ fontSize: 26 }} />,
      data: t.features.items.fleet,
    },
    {
      key: 'drivers',
      icon: <PeopleAltOutlinedIcon style={{ fontSize: 26 }} />,
      data: t.features.items.drivers,
    },
    {
      key: 'invoicing',
      icon: <ReceiptLongOutlinedIcon style={{ fontSize: 26 }} />,
      data: t.features.items.invoicing,
    },
    {
      key: 'suppliers',
      icon: <AccountBalanceWalletOutlinedIcon style={{ fontSize: 26 }} />,
      data: t.features.items.suppliers,
    },
    {
      key: 'treasury',
      icon: <TrendingUpOutlinedIcon style={{ fontSize: 26 }} />,
      data: t.features.items.treasury,
    },
    {
      key: 'tangermed',
      icon: <DirectionsBoatFilledOutlinedIcon style={{ fontSize: 26 }} />,
      data: t.features.items.tangermed,
    },
    {
      key: 'fuel',
      icon: <LocalGasStationOutlinedIcon style={{ fontSize: 26 }} />,
      data: t.features.items.fuel,
    },
  ];

  return (
    <section id="features" className="transivo-section transivo-features-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="transivo-section-header text-center">
          <span className="transivo-section-badge">{t.features.eyebrow}</span>
          <h2 className="transivo-section-title">{t.features.title}</h2>
          <p className="transivo-section-subtitle">{t.features.subtitle}</p>
        </div>

        {/* 8 Features Grid */}
        <div className="transivo-features-grid">
          {featureCards.map((item) => (
            <div key={item.key} className="transivo-feature-card">
              <div className="feature-icon-wrapper" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="feature-card-title">{item.data.title}</h3>
              <p className="feature-card-desc">{item.data.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
