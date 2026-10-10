import React from 'react';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useLandingI18n } from '../context/LandingI18nContext';

export const FloatingWhatsApp: React.FC = () => {
  const { language } = useLandingI18n();
  const whatsappUrl = 'https://wa.me/212720201139';

  const label =
    language === 'ar'
      ? 'تواصل معنا على واتساب: 0720201139'
      : language === 'en'
      ? 'Chat on WhatsApp: 0720201139'
      : 'Discuter sur WhatsApp : 0720201139';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="transivo-floating-whatsapp"
      aria-label={label}
      title={label}
    >
      <div className="whatsapp-pulse" aria-hidden="true" />
      <WhatsAppIcon className="whatsapp-icon" style={{ fontSize: 32 }} />
      <span className="whatsapp-label">{label}</span>
    </a>
  );
};
