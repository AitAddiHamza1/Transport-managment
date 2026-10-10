import React from 'react';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { useLandingI18n } from '../context/LandingI18nContext';
import { TransivoLogo } from './TransivoLogo';

export const Footer: React.FC = () => {
  const { t } = useLandingI18n();
  const currentYear = new Date().getFullYear();

  const phoneDisplay = '0720201139';
  const whatsappUrl = 'https://wa.me/212720201139';
  const telUrl = 'tel:+212720201139';
  const emailAddress = 'transivo03@gmail.com';

  return (
    <footer className="transivo-footer">
      <div className="landing-container">
        <div className="transivo-footer-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <a href="#hero" className="transivo-brand-link" aria-label="Transivo ERP">
              <TransivoLogo size={34} showText={true} />
            </a>
            <p className="footer-tagline">
              {t.footer.tagline}
              <span className="text-cyan">{t.footer.taglineHighlight}</span>
              {t.footer.taglineEnd}
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-heading">{t.footer.quickLinks}</h4>
            <ul className="footer-nav-list">
              <li><a href="#hero" className="footer-link">{t.footer.links.home}</a></li>
              <li><a href="#features" className="footer-link">{t.footer.links.features}</a></li>
              <li><a href="#benefits" className="footer-link">{t.footer.links.benefits}</a></li>
              <li><a href="#preview" className="footer-link">{t.footer.links.preview}</a></li>
              <li><a href="#contact" className="footer-link">{t.footer.links.contact}</a></li>
            </ul>
          </div>

          {/* Modules / Services Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-heading">{t.footer.services}</h4>
            <ul className="footer-nav-list">
              <li><a href="#features" className="footer-link">{t.footer.links.trips}</a></li>
              <li><a href="#features" className="footer-link">{t.footer.links.fleet}</a></li>
              <li><a href="#features" className="footer-link">{t.footer.links.invoicing}</a></li>
              <li><a href="#features" className="footer-link">{t.footer.links.treasury}</a></li>
              <li><a href="#contact" className="footer-link">{t.footer.links.support}</a></li>
            </ul>
          </div>

          {/* Contact Coordinates Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-heading">{t.footer.contact}</h4>
            <ul className="footer-contact-list">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-contact-link"
                  aria-label={`WhatsApp: ${phoneDisplay}`}
                >
                  <WhatsAppIcon style={{ fontSize: 18, color: 'var(--transivo-cyan)' }} />
                  <span dir="ltr">{phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={telUrl}
                  className="footer-contact-link"
                  aria-label={`Téléphone: ${phoneDisplay}`}
                >
                  <PhoneIcon style={{ fontSize: 18, color: 'var(--transivo-cyan)' }} />
                  <span dir="ltr">{phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${emailAddress}`}
                  className="footer-contact-link"
                  aria-label={`Email: ${emailAddress}`}
                >
                  <EmailIcon style={{ fontSize: 18, color: 'var(--transivo-cyan)' }} />
                  <span dir="ltr">{emailAddress}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="transivo-footer-bottom">
          <div className="footer-copyright">
            © {currentYear} Transivo. {t.footer.rights}
          </div>
          <div className="footer-meta">
            {t.footer.professionals}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
