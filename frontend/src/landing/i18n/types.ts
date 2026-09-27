export type LandingLanguage = 'fr' | 'en' | 'ar';

export interface LandingTranslationStructure {
  header: {
    home: string;
    solution: string;
    features: string;
    preview: string;
    contact: string;
    login: string;
    appDashboard: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    stats: {
      centralized: string;
      centralizedDesc: string;
      realtime: string;
      realtimeDesc: string;
      security: string;
      securityDesc: string;
    };
  };
  why: {
    eyebrow: string;
    title: string;
    subtitle: string;
    concepts: {
      operations: { title: string; subtitle: string; desc: string };
      management: { title: string; subtitle: string; desc: string };
      finance: { title: string; subtitle: string; desc: string };
    };
  };
  features: {
    title: string;
    subtitle: string;
    categories: {
      operations: string;
      management: string;
      finance: string;
    };
    operations: {
      vehicles: { title: string; desc: string };
      trips: { title: string; desc: string };
      drivers: { title: string; desc: string };
      crossings: { title: string; desc: string };
    };
    management: {
      clients: { title: string; desc: string };
      suppliers: { title: string; desc: string };
      employees: { title: string; desc: string };
      maintenance: { title: string; desc: string };
      documents: { title: string; desc: string };
    };
    finance: {
      invoicing: { title: string; desc: string };
      payments: { title: string; desc: string };
      expenses: { title: string; desc: string };
      fuel: { title: string; desc: string };
      debts: { title: string; desc: string };
    };
  };
  showcase: {
    eyebrow: string;
    title: string;
    subtitle: string;
    block1: { tag: string; title: string; desc: string };
    block2: { tag: string; title: string; desc: string };
    block3: { tag: string; title: string; desc: string };
  };
  audience: {
    title: string;
    subtitle: string;
    transportCompanies: { title: string; desc: string };
    freightHaulers: { title: string; desc: string };
    fleetManagers: { title: string; desc: string };
    operationsManagers: { title: string; desc: string };
  };
  cta: {
    title: string;
    subtitle: string;
    demoButton: string;
    loginButton: string;
    demoModalTitle: string;
    demoModalDesc: string;
    close: string;
  };
  footer: {
    tagline: string;
    navigation: string;
    product: string;
    company: string;
    solution: string;
    features: string;
    preview: string;
    contact: string;
    legal: string;
    terms: string;
    privacy: string;
    copyright: string;
  };
}
