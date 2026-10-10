export type LandingLanguage = 'fr' | 'en' | 'ar';

export interface LandingTranslationStructure {
  header: {
    home: string;
    features: string;
    preview: string;
    benefits: string;
    contact: string;
    contactCta: string;
    login: string;
    dashboard: string;
  };
  hero: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    titlePart2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    viewDemo: string;
    floatingTag: string;
    pills: {
      simple: string;
      secure: string;
      adapted: string;
    };
  };
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: {
      trips: { title: string; desc: string };
      fleet: { title: string; desc: string };
      drivers: { title: string; desc: string };
      invoicing: { title: string; desc: string };
      suppliers: { title: string; desc: string };
      treasury: { title: string; desc: string };
      tangermed: { title: string; desc: string };
      fuel: { title: string; desc: string };
    };
  };
  preview: {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: {
      dashboard: string;
      tripsFleet: string;
      finance: string;
      modernUi: string;
      responsive: string;
    };
    cta: string;
    watchVideo: string;
    videoModal: {
      title: string;
      subtitle: string;
      comingSoon: string;
      desc: string;
      contactBtn: string;
      close: string;
    };
  };
  benefits: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: {
      ops: { title: string; desc: string };
      profit: { title: string; desc: string };
      time: { title: string; desc: string };
      support: { title: string; desc: string };
    };
  };
  trustBanner: {
    eyebrow: string;
    title: string;
    p1: string;
    p1Desc: string;
    p2: string;
    p2Desc: string;
    p3: string;
    p3Desc: string;
    p4: string;
    p4Desc: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    subtitle: string;
    whatsappLabel: string;
    phoneLabel: string;
    emailLabel: string;
    phoneValue: string;
    emailValue: string;
    form: {
      title: string;
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      subjectLabel: string;
      subjectPlaceholder: string;
      messageLabel: string;
      messagePlaceholder: string;
      submitBtn: string;
      submitting: string;
      validationError: string;
      dialogTitle: string;
      dialogDesc: string;
      sendViaEmail: string;
      sendViaWhatsapp: string;
      closeDialog: string;
    };
  };
  footer: {
    tagline: string;
    taglineHighlight: string;
    taglineEnd: string;
    quickLinks: string;
    services: string;
    contact: string;
    rights: string;
    professionals: string;
    links: {
      home: string;
      features: string;
      preview: string;
      benefits: string;
      contact: string;
      trips: string;
      fleet: string;
      invoicing: string;
      treasury: string;
      support: string;
    };
  };
}
