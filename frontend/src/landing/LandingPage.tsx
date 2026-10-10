import React, { useEffect } from 'react';
import { LandingI18nProvider, useLandingI18n } from './context/LandingI18nContext';
import { LandingThemeProvider } from './context/LandingThemeContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { SoftwarePreview } from './components/SoftwarePreview';
import { WhyTransivo } from './components/WhyTransivo';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import './styles/landing.css';

function LandingPageContent() {
  const { language, dir } = useLandingI18n();

  useEffect(() => {
    // Dynamic page title per language
    if (language === 'ar') {
      document.title = 'ترانسيفو — الإدارة الذكية لشركة النقل واللوجستيك';
    } else if (language === 'en') {
      document.title = 'Transivo — Smart Transport & Fleet Management ERP';
    } else {
      document.title = 'Transivo — La gestion intelligente de votre entreprise de transport';
    }

    // Dynamic meta description tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }

    const descContent =
      language === 'ar'
        ? 'ترانسيفو يمركز عمليات النقل، أسطول الشاحنات، الفوترة والتتبع المالي في منصة سحابية واحدة ذكية وسهلة الاستخدام.'
        : language === 'en'
        ? 'Transivo centralizes your transport operations, fleet, invoicing, and financial tracking into one unified, intelligent platform.'
        : 'Transivo centralise vos opérations, votre flotte, votre facturation et votre suivi financier dans une seule plateforme intelligente.';

    metaDesc.setAttribute('content', descContent);

    // Dynamic OpenGraph Title & Description
    const updateOrCreateMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateOrCreateMeta('og:title', document.title);
    updateOrCreateMeta('og:description', descContent);
    updateOrCreateMeta('og:type', 'website');
    updateOrCreateMeta('og:image', '/hero-truck.png');
  }, [language]);

  return (
    <div className="transivo-landing-wrapper" dir={dir}>
      <Header />
      <main id="main-content">
        <Hero />
        <Features />
        <SoftwarePreview />
        <WhyTransivo />
        <ContactSection />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

export function LandingPage() {
  return (
    <LandingI18nProvider>
      <LandingThemeProvider>
        <LandingPageContent />
      </LandingThemeProvider>
    </LandingI18nProvider>
  );
}

export default LandingPage;
