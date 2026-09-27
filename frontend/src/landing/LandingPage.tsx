import React, { useEffect } from 'react';
import { LandingI18nProvider, useLandingI18n } from './context/LandingI18nContext';
import { LandingThemeProvider } from './context/LandingThemeContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { WhyTransivo } from './components/WhyTransivo';
import { Features } from './components/Features';
import { ProductShowcase } from './components/ProductShowcase';
import { TargetAudience } from './components/TargetAudience';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import './styles/landing.css';

function LandingPageContent() {
  const { language } = useLandingI18n();

  useEffect(() => {
    // Dynamic page title per language
    if (language === 'ar') {
      document.title = 'ترانسيفو — إدارة ذكية للنقل واللوجستيك';
    } else if (language === 'en') {
      document.title = 'TRANSIVO — Smart Transport Management ERP';
    } else {
      document.title = 'TRANSIVO — Gestion intelligente du transport';
    }

    // Set meta description tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'TRANSIVO est le logiciel ERP centralisé pour la gestion de vos opérations de transport, flotte de véhicules, voyages, carburant et facturation.',
    );
  }, [language]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhyTransivo />
        <Features />
        <ProductShowcase />
        <TargetAudience />
        <CtaSection />
      </main>
      <Footer />
    </>
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
