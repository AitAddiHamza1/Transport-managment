import { LandingLanguage, LandingTranslationStructure } from './types';

export const translations: Record<LandingLanguage, LandingTranslationStructure> = {
  fr: {
    header: {
      home: 'Accueil',
      solution: 'Pourquoi TRANSIVO',
      features: 'Fonctionnalités',
      preview: 'Aperçu',
      contact: 'Contact',
      login: 'Se connecter',
      appDashboard: 'Espace ERP',
    },
    hero: {
      badge: 'LOGICIEL ERP TRANSPORT & LOGISTIQUE',
      title: 'La gestion intelligente de votre entreprise de transport.',
      description:
        'TRANSIVO centralise vos opérations de transport, le suivi de flotte, la gestion des voyages, la facturation client et le contrôle du stock de carburant au sein d\'une solution logicielle unifiée.',
      primaryCta: 'Découvrir la solution',
      secondaryCta: 'Se connecter à l\'ERP',
      stats: {
        centralized: 'Plate-forme Unique',
        centralizedDesc: 'Toutes les données opérationnelles regroupées',
        realtime: 'Suivi Rigoureux',
        realtimeDesc: 'Contrôle précis des voyages et dépenses',
        security: 'Conformité & Sécurité',
        securityDesc: 'Gestion documentaire et contrôle d\'accès',
      },
    },
    why: {
      eyebrow: 'PILOTAGE CENTRALISÉ',
      title: 'Un seul espace pour piloter toute votre activité.',
      subtitle:
        'Conçu sur mesure pour résoudre la complexité quotidienne des opérations de transport et de gestion de flotte.',
      concepts: {
        operations: {
          title: 'Exploitation & Flotte',
          subtitle: 'Visibilité totale sur vos missions',
          desc: 'Affectation des chauffeurs et véhicules, suivi des trajets, traversées maritimes et contrôle des étapes.',
        },
        management: {
          title: 'Administration & RH',
          subtitle: 'Organisation sans faille',
          desc: 'Centralisation des documents administratifs, suivi des échéances, cartes grises et rémunérations.',
        },
        finance: {
          title: 'Finance & Carburant',
          subtitle: 'Maîtrise budgétaire stricte',
          desc: 'Émission des factures, suivi des règlements clients, dépenses véhicules et consommation gasoil.',
        },
      },
    },
    features: {
      title: 'Des fonctionnalités métier intégrées',
      subtitle:
        'Une suite d\'outils spécialisés conçus pour répondre aux besoins réels des transporteurs.',
      categories: {
        operations: 'Exploitation',
        management: 'Gestion & RH',
        finance: 'Finance & Stock',
      },
      operations: {
        vehicles: {
          title: 'Gestion de la Flotte',
          desc: 'Fiches techniques des véhicules, cartes grises, catégories et affectations.',
        },
        trips: {
          title: 'Suivi des Voyages',
          desc: 'Planification des trajets, affectation des chauffeurs, départs et arrivées.',
        },
        drivers: {
          title: 'Conducteurs & Chauffeurs',
          desc: 'Suivi des permis de conduire, historique d\'activité et affectations.',
        },
        crossings: {
          title: 'Traversées Maritimes',
          desc: 'Gestion des réservations portuaires et frais de traversées de fret.',
        },
      },
      management: {
        clients: {
          title: 'Fichier Clients',
          desc: 'Répertoire des clients, historique des commandes et encours.',
        },
        suppliers: {
          title: 'Comptes Fournisseurs',
          desc: 'Suivi des prestataires, pièces détachées et maintenance.',
        },
        employees: {
          title: 'Ressources Humaines',
          desc: 'Gestion des collaborateurs, acomptes et règlements du personnel.',
        },
        maintenance: {
          title: 'Carnet d\'Entretien',
          desc: 'Planification des vidanges, réparations et suivi préventif.',
        },
        documents: {
          title: 'Centre Documentaire',
          desc: 'Alertes pour assurances, contrôles techniques et autorisations.',
        },
      },
      finance: {
        invoicing: {
          title: 'Facturation Transport',
          desc: 'Création et émission de factures, suivi des statuts de paiement.',
        },
        payments: {
          title: 'Paiements Clients',
          desc: 'Enregistrement des versements et réconciliation des créances.',
        },
        expenses: {
          title: 'Charges Véhicules',
          desc: 'Suivi détaillé des charges d\'exploitation et frais annexes.',
        },
        fuel: {
          title: 'Gasoil & Stock',
          desc: 'Gestion des bons de carburant et approvisionnement des cuves.',
        },
        debts: {
          title: 'Dettes Fournisseurs',
          desc: 'Suivi des échéances de paiement, chèques et lettres de change.',
        },
      },
    },
    showcase: {
      eyebrow: 'APERÇU DU LOGICIEL',
      title: 'Une interface pensée pour l\'efficacité opérationnelle',
      subtitle:
        'Découvrez l\'environnement de travail TRANSIVO conçu pour accélérer la prise de décision.',
      block1: {
        tag: 'EXPLOITATION EN TEMPS RÉEL',
        title: 'Pilotage de l\'exploitation & des voyages',
        desc: 'Visualisez l\'état d\'avancement de vos missions, l\'affectation des tracteurs et remorques ainsi que le respect des plannings de livraison.',
      },
      block2: {
        tag: 'GESTION DE FLOTTE',
        title: 'Parc de véhicules & conformité administrative',
        desc: 'Gardez le contrôle sur l\'état de votre parc routier. Soyez alerté automatiquement des échéances de contrôle technique et d\'assurance.',
      },
      block3: {
        tag: 'PILOTAGE FINANCIER',
        title: 'Facturation client & contrôle du carburant',
        desc: 'Suivez la santé financière de votre activité, vos factures impayées, la ventilation des dépenses et l\'état de vos stocks de gasoil.',
      },
    },
    audience: {
      title: 'Conçu pour les entreprises qui vivent le transport au quotidien.',
      subtitle:
        'TRANSIVO s\'adapte aux structures qui recherchent de la rigueur et une organisation sans faille.',
      transportCompanies: {
        title: 'Entreprises de Transport',
        desc: 'Sociétés de transport routier désireuses de structurer leurs données et leurs processus.',
      },
      freightHaulers: {
        title: 'Transporteurs Routiers & Fret',
        desc: 'Opérateurs gérant des flux de marchandises nationaux et des traversées maritimes.',
      },
      fleetManagers: {
        title: 'Gestionnaires de Flotte',
        desc: 'Responsables axés sur le maintien en état du matériel et le contrôle des coûts.',
      },
      operationsManagers: {
        title: 'Responsables d\'Exploitation',
        desc: 'Équipes d\'exploitation au cœur de l\'organisation des missions et de la relation chauffeur.',
      },
    },
    cta: {
      title: 'Pilotez votre activité avec plus de clarté.',
      subtitle:
        'Découvrez comment TRANSIVO peut simplifier votre gestion quotidienne et sécuriser l\'ensemble de vos opérations.',
      demoButton: 'Demander une démonstration',
      loginButton: 'Se connecter à l\'ERP',
      demoModalTitle: 'Demande de Démonstration TRANSIVO',
      demoModalDesc:
        'Pour échanger avec notre équipe et découvrir une démonstration adaptée à vos flux de transport, contactez-nous.',
      close: 'Fermer',
    },
    footer: {
      tagline: 'Système ERP de Gestion Intelligente du Transport Routier & Logistique.',
      navigation: 'Navigation',
      product: 'Produit',
      company: 'Entreprise',
      solution: 'Pourquoi TRANSIVO',
      features: 'Fonctionnalités',
      preview: 'Aperçu du logiciel',
      contact: 'Contact',
      legal: 'Mentions Légales',
      terms: 'Conditions d\'Utilisation',
      privacy: 'Politique de Confidentialité',
      copyright: '© 2026 TRANSIVO. Tous droits réservés.',
    },
  },
  en: {
    header: {
      home: 'Home',
      solution: 'Why TRANSIVO',
      features: 'Features',
      preview: 'Preview',
      contact: 'Contact',
      login: 'Sign In',
      appDashboard: 'ERP Platform',
    },
    hero: {
      badge: 'TRANSPORT & LOGISTICS ERP SOFTWARE',
      title: 'Smart management for your transport business.',
      description:
        'TRANSIVO centralizes your transport operations, fleet tracking, trip dispatching, client invoicing, and fuel inventory control in a single unified software platform.',
      primaryCta: 'Explore Solution',
      secondaryCta: 'Sign In to ERP',
      stats: {
        centralized: 'Single Platform',
        centralizedDesc: 'All operational data gathered in one place',
        realtime: 'Rigorous Tracking',
        realtimeDesc: 'Precise control of trips and operational costs',
        security: 'Compliance & Safety',
        securityDesc: 'Document management and role access control',
      },
    },
    why: {
      eyebrow: 'CENTRALIZED MANAGEMENT',
      title: 'One platform to manage your entire business.',
      subtitle:
        'Tailor-made to solve daily operational complexities faced by road freight and logistics operators.',
      concepts: {
        operations: {
          title: 'Operations & Fleet',
          subtitle: 'Full visibility on active trips',
          desc: 'Driver and truck assignments, route monitoring, ferry crossings, and checkpoint tracking.',
        },
        management: {
          title: 'Administration & HR',
          subtitle: 'Seamless organization',
          desc: 'Centralized administrative documents, deadline tracking, registration cards, and staff payroll.',
        },
        finance: {
          title: 'Finance & Fuel',
          subtitle: 'Strict budget control',
          desc: 'Client invoicing, payment tracking, vehicle expenses, and fuel consumption management.',
        },
      },
    },
    features: {
      title: 'Integrated industry features',
      subtitle:
        'A suite of specialized tools engineered to meet the actual needs of transport companies.',
      categories: {
        operations: 'Operations',
        management: 'Management & HR',
        finance: 'Finance & Fuel',
      },
      operations: {
        vehicles: {
          title: 'Fleet Management',
          desc: 'Vehicle technical sheets, registration cards, categories, and assignments.',
        },
        trips: {
          title: 'Trip Tracking',
          desc: 'Route planning, driver dispatch, departure and arrival monitoring.',
        },
        drivers: {
          title: 'Driver Management',
          desc: 'Driver license tracking, activity history, and route assignments.',
        },
        crossings: {
          title: 'Sea Crossings',
          desc: 'Port bookings and sea link freight fee management.',
        },
      },
      management: {
        clients: {
          title: 'Client Records',
          desc: 'Client directory, order history, and account balances.',
        },
        suppliers: {
          title: 'Supplier Accounts',
          desc: 'Vendor tracking, spare parts, and maintenance providers.',
        },
        employees: {
          title: 'Human Resources',
          desc: 'Employee files, advances, and payroll processing.',
        },
        maintenance: {
          title: 'Maintenance Log',
          desc: 'Service scheduling, repairs, and preventive maintenance.',
        },
        documents: {
          title: 'Document Center',
          desc: 'Automated alerts for insurance, technical inspections, and permits.',
        },
      },
      finance: {
        invoicing: {
          title: 'Transport Invoicing',
          desc: 'Invoice generation, status tracking, and payment receipts.',
        },
        payments: {
          title: 'Client Payments',
          desc: 'Payment recording and open invoice reconciliation.',
        },
        expenses: {
          title: 'Vehicle Expenses',
          desc: 'Detailed breakdown of operating charges and overheads.',
        },
        fuel: {
          title: 'Fuel & Gasoil Stock',
          desc: 'Fuel voucher monitoring and fuel tank refilling records.',
        },
        debts: {
          title: 'Supplier Debts',
          desc: 'Vendor payment due dates, checks, and promissory notes.',
        },
      },
    },
    showcase: {
      eyebrow: 'SOFTWARE PREVIEW',
      title: 'An interface designed for operational efficiency',
      subtitle:
        'Discover the TRANSIVO workspace engineered to accelerate decision-making.',
      block1: {
        tag: 'REAL-TIME OPERATIONS',
        title: 'Dispatch & trip management',
        desc: 'Monitor trip progress, truck and trailer assignments, and delivery schedules in real time.',
      },
      block2: {
        tag: 'FLEET MANAGEMENT',
        title: 'Fleet overview & document compliance',
        desc: 'Maintain complete control over vehicle health. Receive automated alerts for insurance and technical inspections.',
      },
      block3: {
        tag: 'FINANCIAL CONTROL',
        title: 'Client billing & fuel inventory control',
        desc: 'Track financial performance, open customer balances, expense breakdowns, and fuel tank levels.',
      },
    },
    audience: {
      title: 'Built for companies that live transport every day.',
      subtitle:
        'TRANSIVO adapts to transport enterprises seeking structured organization and operational clarity.',
      transportCompanies: {
        title: 'Transport Companies',
        desc: 'Road transport enterprises aiming to structure their operational data and workflows.',
      },
      freightHaulers: {
        title: 'Freight & Haulage Operators',
        desc: 'Logistics professionals managing national freight routes and international sea links.',
      },
      fleetManagers: {
        title: 'Fleet Managers',
        desc: 'Fleet executives focused on maintenance optimization and cost control.',
      },
      operationsManagers: {
        title: 'Operations Executives',
        desc: 'Dispatch teams managing daily missions and driver coordination.',
      },
    },
    cta: {
      title: 'Run your transport operations with greater clarity.',
      subtitle:
        'Discover how TRANSIVO can simplify your daily management and secure your operations.',
      demoButton: 'Request a Demo',
      loginButton: 'Sign In to ERP',
      demoModalTitle: 'Request a TRANSIVO Demo',
      demoModalDesc:
        'Contact our team to receive a presentation tailored to your transport operations.',
      close: 'Close',
    },
    footer: {
      tagline: 'Smart ERP System for Road Transport & Logistics Management.',
      navigation: 'Navigation',
      product: 'Product',
      company: 'Company',
      solution: 'Why TRANSIVO',
      features: 'Features',
      preview: 'Software Preview',
      contact: 'Contact',
      legal: 'Legal Notice',
      terms: 'Terms of Use',
      privacy: 'Privacy Policy',
      copyright: '© 2026 TRANSIVO. All rights reserved.',
    },
  },
  ar: {
    header: {
      home: 'الرئيسية',
      solution: 'لماذا ترانسيفو',
      features: 'المميزات',
      preview: 'معاينة النظام',
      contact: 'اتصل بنا',
      login: 'تسجيل الدخول',
      appDashboard: 'نظام ERP',
    },
    hero: {
      badge: 'برنامج ERP لإدارة النقل واللوجستيك',
      title: 'إدارة ذكية لشركة النقل الخاصة بك.',
      description:
        'ترانسيفو يجمع عمليات النقل، تتبع الأسطول، إدارة الرحلات، الفوترة ومخزون الوقود في نظام برمجي موحد وعالي الكفاءة.',
      primaryCta: 'استكشف الحل',
      secondaryCta: 'تسجيل الدخول إلى النظام',
      stats: {
        centralized: 'منصة موحدة',
        centralizedDesc: 'تجميع كافة التشغيل في مكان واحد',
        realtime: 'تتبع دقيق',
        realtimeDesc: 'مراقبة محكمة للرحلات والمصاريف',
        security: 'أمان ومطابقة',
        securityDesc: 'إدارة الوثائق والتحكم في الصلاحيات',
      },
    },
    why: {
      eyebrow: 'إدارة مركزية',
      title: 'منصة واحدة لقيادة كافة أنشطتك.',
      subtitle:
        'مصممة خصيصاً لحل التعقيدات اليومية لعمليات النقل وإدارة الأسطول.',
      concepts: {
        operations: {
          title: 'الاستغلال والأسطول',
          subtitle: 'رؤية شاملة للرحلات',
          desc: 'تعيين السائقين والمركبات، تتبع المسارات، العبور البحري والمحطات.',
        },
        management: {
          title: 'الإدارة والموارد البشرية',
          subtitle: 'تنظيم دقيق ومحكم',
          desc: 'مركزة الوثائق الإدارية، تتبع التواريخ، البطاقات الرمادية والأجور.',
        },
        finance: {
          title: 'المالية والوقود',
          subtitle: 'تحكم مالي صارم',
          desc: 'إصدار الفواتير، متابعة المستحقات، مصاريف الشاحنات واستهلاك الوقود.',
        },
      },
    },
    features: {
      title: 'مميزات متكاملة لمهنة النقل',
      subtitle:
        'مجموعة أدوات متخصصة مصممة لتلبية الاحتياجات الحقيقية لشركات النقل.',
      categories: {
        operations: 'الاستغلال والعمليات',
        management: 'الإدارة والموارد البشرية',
        finance: 'المالية والوقود',
      },
      operations: {
        vehicles: {
          title: 'إدارة الأسطول',
          desc: 'البطاقات التقنية للشاحنات، البطاقات الرمادية والتصنيفات.',
        },
        trips: {
          title: 'تتبع الرحلات',
          desc: 'تخطيط المسارات، تعيين السائقين وتتبع المغادرة والوصول.',
        },
        drivers: {
          title: 'إدارة السائقين',
          desc: 'متابعة رخص السياقة، سجل النشاط وتعيين المهام.',
        },
        crossings: {
          title: 'الرحلات البحرية',
          desc: 'إدارة حوزات الموانئ ورسوم العبور بحراً.',
        },
      },
      management: {
        clients: {
          title: 'سجل الزبناء',
          desc: 'دليل الزبناء، سجل الطلبيات والحسابات.',
        },
        suppliers: {
          title: 'حسابات الموردين',
          desc: 'متابعة المزودين، قطع الغيار وخدمات الصيانة.',
        },
        employees: {
          title: 'الموارد البشرية',
          desc: 'ملفات الموظفين، التسقيعات ومعالجة الأجور.',
        },
        maintenance: {
          title: 'دفتر الصيانة',
          desc: 'جدولة الصيانة، الإصلاحات والتفقد الوقائي.',
        },
        documents: {
          title: 'مركز الوثائق',
          desc: 'تنبيهات الفحص التقني، التأمينات والرخص.',
        },
      },
      finance: {
        invoicing: {
          title: 'فوترة النقل',
          desc: 'إنشاء الفواتير، متابعة الحالة وإصدار الإيصالات.',
        },
        payments: {
          title: 'دفعات الزبناء',
          desc: 'تسجيل التحويلات وتعديل الفواتير المفتوحة.',
        },
        expenses: {
          title: 'مصاريف المركبات',
          desc: 'تفصيل مصاريف التشغيل والتكاليف الإضافية.',
        },
        fuel: {
          title: 'الوقود والمخزون',
          desc: 'مراقبة وصلات الوقود وتزود الخزانات.',
        },
        debts: {
          title: 'ديون الموردين',
          desc: 'تتبع مواعيد الأداء، الشيكات والكمبيالات.',
        },
      },
    },
    showcase: {
      eyebrow: 'معاينة النظام',
      title: 'واجهة عصرية صممت للفعالية التشغيلية',
      subtitle:
        'اكتشف بيئة عمل ترانسيفو المخصصة لتسريع اتخاذ القرارات.',
      block1: {
        tag: 'الاستغلال المباشر',
        title: 'إدارة الاستغلال والرحلات',
        desc: 'تابع تقدم الرحلات، تعيين الشاحنات والمقطورات واحترام مواعيد التسليم.',
      },
      block2: {
        tag: 'إدارة الأسطول',
        title: 'أسطول المركبات والامتثال الإداري',
        desc: 'تحكم كامل في حالة الشاحنات. احصل على تنبيهات آلية للفحص التقني والتأمين.',
      },
      block3: {
        tag: 'القيادة المالية',
        title: 'فوترة الزبناء ومراقبة الوقود',
        desc: 'تابع الأداء المالي، الفواتير الغير مؤداة، تفصيل المصاريف ومستويات خزانات الوقود.',
      },
    },
    audience: {
      title: 'صمم لشركات تعيش النقل يومياً.',
      subtitle:
        'ترانسيفو يلائم مؤسسات النقل الباحثة عن التنظيم والدقة التشغيلية.',
      transportCompanies: {
        title: 'شركات النقل الطرقية',
        desc: 'المؤسسات الراغبة في هيكلة بياناتها وعملياتها التشغيلية.',
      },
      freightHaulers: {
        title: 'ناقلو البضائع والشحن الدولي',
        desc: 'المهنيون الذين يديرون رحلات وطنية وخطوط عبور بحرية.',
      },
      fleetManagers: {
        title: 'مدراء الأساطيل',
        desc: 'المسؤولون عن صيانة الشاحنات ومراقبة التكاليف.',
      },
      operationsManagers: {
        title: 'مسؤولو الاستغلال',
        desc: 'فرق الاستغلال المكلفة بتنظيم المهام وتنسيق السائقين.',
      },
    },
    cta: {
      title: 'أدر نشاط النقل الخاص بك بوضوح أكبر.',
      subtitle:
        'اكتشف كيف يمكن لبرنامج ترانسيفو تبسيط إدارتك اليومية وتأمين عملياتك.',
      demoButton: 'طلب عرض توضيحي',
      loginButton: 'تسجيل الدخول إلى النظام',
      demoModalTitle: 'طلب عرض توضيحي لبرنامج ترانسيفو',
      demoModalDesc:
        'للتواصل مع فريقنا واكتشاف عرض توضيحي مخصص لشركتك، يرجى الاتصال بنا.',
      close: 'إغلاق',
    },
    footer: {
      tagline: 'نظام ERP الذكي لإدارة النقل واللوجستيك.',
      navigation: 'التنقل',
      product: 'المنتج',
      company: 'الشركة',
      solution: 'لماذا ترانسيفو',
      features: 'المميزات',
      preview: 'معاينة النظام',
      contact: 'الاتصال',
      legal: 'إشعار قانوني',
      terms: 'شروط الاستخدام',
      privacy: 'سياسة الخصوصية',
      copyright: '© 2026 ترانسيفو. جميع الحقوق محفوظة.',
    },
  },
};
