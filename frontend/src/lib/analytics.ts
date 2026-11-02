/**
 * Module de gestion de la confidentialité et de Google Analytics 4 (GA4) pour Transivo.
 *
 * Principes stricts de conformité et de confidentialité :
 * 1. Activation UNIQUEMENT en environnement de production (import.meta.env.PROD === true)
 *    ET sur le domaine officiel transivo.tech (ou www.transivo.tech).
 * 2. Mode Basic Consent : AUCUN chargement de script tiers ni événement envoyé avant
 *    le consentement explicite de l'utilisateur.
 * 3. En cas de refus : aucun script GA4 n'est chargé, aucun ping n'est émis.
 * 4. Protection PII absolue : aucune donnée personnelle (nom, email, immatriculation,
 *    numéro de facture, montant, identifiant de tenant) n'est transmise.
 * 5. Nettoyage strict des URLs : query strings et hash fragments sont totalement éliminés,
 *    les identifiants dynamiques dans les chemins sont masqués sous forme de templates (:id).
 */

export const CONSENT_STORAGE_KEY = 'transivo_cookie_consent_v1';
export const PRODUCTION_HOSTNAME = 'transivo.tech';
export const PRODUCTION_WWW_HOSTNAME = 'www.transivo.tech';
export const PRODUCTION_ORIGIN = 'https://transivo.tech';

export type ConsentStatus = 'accepted' | 'rejected' | null;

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

let isInitialized = false;

/**
 * Récupère le Measurement ID depuis les variables d'environnement Vite.
 * La valeur n'est déclarée nulle part en dur dans le code source applicatif.
 */
export function getMeasurementId(): string {
  const env = import.meta.env as unknown as { VITE_GA_MEASUREMENT_ID?: string };
  return (env && env.VITE_GA_MEASUREMENT_ID) ? env.VITE_GA_MEASUREMENT_ID.trim() : '';
}

/**
 * Vérifie si le runtime actuel est éligible au tracking GA4 :
 * - Mode production Vite (PROD === true)
 * - Hostname correspondant au domaine de production Transivo
 */
export function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const isProd = import.meta.env.PROD === true;
  const hostname = window.location.hostname.toLowerCase();
  return isProd && (hostname === PRODUCTION_HOSTNAME || hostname === PRODUCTION_WWW_HOSTNAME);
}

/**
 * Lit le statut du consentement stocké localement.
 */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === 'accepted' || value === 'rejected') {
      return value;
    }
  } catch {
    // Gestion silencieuse en cas de restriction de stockage (ex: navigation privée stricte)
  }
  return null;
}

/**
 * Enregistre le choix de consentement de l'utilisateur et synchronise l'état de GA4.
 */
export function setConsentStatus(status: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Ignore les erreurs d'écriture de localStorage
  }

  if (status === 'accepted') {
    initGA();
  } else {
    // En cas de refus ultérieur, si gtag existe déjà en mémoire, mise à jour du consentement vers denied
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  }

  window.dispatchEvent(new CustomEvent('transivo-consent-changed', { detail: status }));
}

/**
 * Initialise Google Analytics 4 selon le protocole Basic Consent Mode :
 * - Ne s'exécute QUE si le domaine est transivo.tech et l'environnement PROD.
 * - Ne s'exécute QUE si le consentement est 'accepted'.
 * - Empêche toute double injection de script ou réinitialisation.
 */
export function initGA(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Restriction stricte d'environnement et de domaine
  if (!isProductionEnvironment()) {
    return false;
  }

  // 2. Vérification obligatoire du consentement explicite
  if (getConsentStatus() !== 'accepted') {
    return false;
  }

  // 3. Empêcher la ré-initialisation
  if (isInitialized) {
    return true;
  }

  const measurementId = getMeasurementId();
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    return false;
  }

  // 4. Empêcher l'injection de scripts multiples
  if (document.getElementById('transivo-ga4-script')) {
    isInitialized = true;
    return true;
  }

  try {
    // Initialisation dataLayer & fonction gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    // Consent Mode v2 par défaut : denied avant tout chargement de balise
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    // Injection asynchrone sécurisée du script Google Tag
    const script = document.createElement('script');
    script.id = 'transivo-ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onerror = () => {
      // Échec de chargement gracieux (ad-blocker, hors-ligne, etc.)
      isInitialized = false;
    };
    document.head.appendChild(script);

    // Configuration GA4 SPA : send_page_view désactivé pour éviter les doublons avec React Router
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      anonymize_ip: true,
      restricted_data_processing: true,
    });

    // Mise à jour du consentement vers granted après acceptation explicite
    gtag('consent', 'update', {
      analytics_storage: 'granted',
    });

    isInitialized = true;
    return true;
  } catch {
    isInitialized = false;
    return false;
  }
}

/**
 * Allowlist stricte des routes statiques autorisées, calquée sur l'arbre de routage React Router.
 * Aucune chaîne de caractères arbitraire ou non répertoriée ne peut franchir cette étape.
 */
const KNOWN_STATIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/change-password',
  '/403',
  '/404',
  '/notifications',
  '/app',
  '/app/dashboard',
  '/app/vehicules',
  '/app/voyages',
  '/app/factures',
  '/app/conducteurs',
  '/app/clients',
  '/app/fournisseurs',
  '/vehicules',
  '/vehicules/liste',
  '/vehicules/documents',
  '/conducteurs',
  '/conducteurs/liste',
  '/conducteurs/documents',
  '/voyages',
  '/voyages/liste',
  '/charges-vehicules',
  '/carnet-entretien',
  '/traversees-maritimes',
  '/clients',
  '/clients/liste',
  '/parametres-entreprise',
  '/settings/company',
  '/paiements-clients',
  '/factures',
  '/fournisseurs',
  '/fournisseurs/liste',
  '/dettes-fournisseurs',
  '/paiements-fournisseurs',
  '/consommation-gasoil',
  '/stock-gasoil',
  '/gestion-paiements',
  '/cheques-lettres-change',
  '/employes',
  '/paiements-employes',
  '/users',
  '/platform-admin',
  '/platform-admin/login',
  '/platform-admin/companies',
  '/platform-admin/change-password',
]);

/**
 * Mapping strict des préfixes dynamiques vers leurs templates anonymisés.
 * Tout sous-segment (nom de client, prénom d'employé, numéro de facture, matricule, UUID)
 * est neutralisé et remplacé par le template générique ':id'.
 */
interface DynamicRouteRule {
  prefix: string;
  template: string;
}

const KNOWN_DYNAMIC_ROUTES: DynamicRouteRule[] = [
  { prefix: '/platform-admin/companies/', template: '/platform-admin/companies/:id' },
  { prefix: '/clients/', template: '/clients/:id' },
  { prefix: '/app/clients/', template: '/app/clients/:id' },
  { prefix: '/employes/', template: '/employes/:id' },
  { prefix: '/app/employes/', template: '/app/employes/:id' },
  { prefix: '/conducteurs/', template: '/conducteurs/:id' },
  { prefix: '/app/conducteurs/', template: '/app/conducteurs/:id' },
  { prefix: '/vehicules/', template: '/vehicules/:id' },
  { prefix: '/app/vehicules/', template: '/app/vehicules/:id' },
  { prefix: '/voyages/', template: '/voyages/:id' },
  { prefix: '/app/voyages/', template: '/app/voyages/:id' },
  { prefix: '/factures/', template: '/factures/:id' },
  { prefix: '/app/factures/', template: '/app/factures/:id' },
  { prefix: '/fournisseurs/', template: '/fournisseurs/:id' },
  { prefix: '/app/fournisseurs/', template: '/app/fournisseurs/:id' },
  { prefix: '/paiements-clients/', template: '/paiements-clients/:id' },
  { prefix: '/paiements-fournisseurs/', template: '/paiements-fournisseurs/:id' },
  { prefix: '/paiements-employes/', template: '/paiements-employes/:id' },
  { prefix: '/dettes-fournisseurs/', template: '/dettes-fournisseurs/:id' },
  { prefix: '/charges-vehicules/', template: '/charges-vehicules/:id' },
  { prefix: '/carnet-entretien/', template: '/carnet-entretien/:id' },
  { prefix: '/traversees-maritimes/', template: '/traversees-maritimes/:id' },
  { prefix: '/users/', template: '/users/:id' },
];

/**
 * Assainit le chemin de navigation selon une politique stricte d'allowlist.
 *
 * Règles :
 * 1. Tout query string (?...) et tout fragment hash (#...) sont strictement éliminés.
 * 2. Si le chemin correspond exactement à une route statique autorisée, il est renvoyé tel quel.
 * 3. Si le chemin correspond à un préfixe dynamique connu, il est converti en son template sécurisé (:id),
 *    interdisant à tout identifiant alphabétique ou numérique de fuiter.
 * 4. TOUTE autre route inconnue ou non répertoriée est systématiquement convertie en '/404'.
 */
export function sanitizePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') return '/';

  // 1. Suppression systématique des query strings et hashes
  const pathWithoutQueryOrHash = rawPath.split('?')[0].split('#')[0];
  const normalized = pathWithoutQueryOrHash.replace(/\/+$/, '') || '/';

  // 2. Vérification dans l'allowlist des routes statiques exactes
  if (KNOWN_STATIC_ROUTES.has(normalized)) {
    return normalized;
  }

  // 3. Vérification des préfixes de routes dynamiques autorisées
  const normalizedWithSlash = normalized.endsWith('/') ? normalized : `${normalized}/`;
  for (const rule of KNOWN_DYNAMIC_ROUTES) {
    if (normalizedWithSlash.startsWith(rule.prefix)) {
      return rule.template;
    }
  }

  // 4. Protection absolue : toute route inconnue est neutralisée vers /404
  return '/404';
}

/**
 * Génère un titre de page générique et sécurisé, évitant toute fuite d'information
 * contextuelle présente dans `document.title` (ex: noms de clients, matricules).
 */
export function getSafePageTitle(sanitizedPath: string): string {
  const titles: Record<string, string> = {
    '/': 'Transivo — Solution de gestion pour transporteurs',
    '/login': 'Connexion — Transivo',
    '/register': 'Inscription — Transivo',
    '/change-password': 'Modification du mot de passe — Transivo',
    '/app': 'Tableau de bord — Transivo',
    '/app/dashboard': 'Tableau de bord — Transivo',
    '/app/vehicules': 'Véhicules — Transivo',
    '/app/vehicules/:id': 'Détail Véhicule — Transivo',
    '/app/voyages': 'Voyages — Transivo',
    '/app/voyages/:id': 'Détail Voyage — Transivo',
    '/app/factures': 'Factures — Transivo',
    '/app/factures/:id': 'Détail Facture — Transivo',
    '/app/conducteurs': 'Conducteurs — Transivo',
    '/app/conducteurs/:id': 'Détail Conducteur — Transivo',
    '/app/clients': 'Clients — Transivo',
    '/app/clients/:id': 'Détail Client — Transivo',
    '/app/fournisseurs': 'Fournisseurs — Transivo',
    '/app/fournisseurs/:id': 'Détail Fournisseur — Transivo',
    '/app/employes': 'Employés — Transivo',
    '/app/employes/:id': 'Détail Employé — Transivo',
    '/vehicules': 'Véhicules — Transivo',
    '/vehicules/liste': 'Liste des Véhicules — Transivo',
    '/vehicules/documents': 'Documents Véhicules — Transivo',
    '/vehicules/:id': 'Détail Véhicule — Transivo',
    '/conducteurs': 'Conducteurs — Transivo',
    '/conducteurs/liste': 'Liste des Conducteurs — Transivo',
    '/conducteurs/documents': 'Documents Conducteurs — Transivo',
    '/conducteurs/:id': 'Détail Conducteur — Transivo',
    '/voyages': 'Voyages — Transivo',
    '/voyages/liste': 'Liste des Voyages — Transivo',
    '/voyages/:id': 'Détail Voyage — Transivo',
    '/charges-vehicules': 'Charges Véhicules — Transivo',
    '/charges-vehicules/:id': 'Détail Charge — Transivo',
    '/carnet-entretien': 'Carnet d’Entretien — Transivo',
    '/carnet-entretien/:id': 'Détail Entretien — Transivo',
    '/traversees-maritimes': 'Traversées Maritimes — Transivo',
    '/traversees-maritimes/:id': 'Détail Traversée — Transivo',
    '/clients': 'Clients — Transivo',
    '/clients/liste': 'Liste des Clients — Transivo',
    '/clients/:id': 'Détail Client — Transivo',
    '/factures': 'Factures — Transivo',
    '/factures/:id': 'Détail Facture — Transivo',
    '/fournisseurs': 'Fournisseurs — Transivo',
    '/fournisseurs/liste': 'Liste des Fournisseurs — Transivo',
    '/fournisseurs/:id': 'Détail Fournisseur — Transivo',
    '/dettes-fournisseurs': 'Dettes Fournisseurs — Transivo',
    '/dettes-fournisseurs/:id': 'Détail Dette Fournisseur — Transivo',
    '/paiements-fournisseurs': 'Paiements Fournisseurs — Transivo',
    '/paiements-fournisseurs/:id': 'Détail Paiement Fournisseur — Transivo',
    '/paiements-clients': 'Paiements Clients — Transivo',
    '/paiements-clients/:id': 'Détail Paiement Client — Transivo',
    '/consommation-gasoil': 'Consommation Carburant — Transivo',
    '/stock-gasoil': 'Stock Gasoil — Transivo',
    '/gestion-paiements': 'Gestion des Paiements — Transivo',
    '/cheques-lettres-change': 'Chèques et Effets — Transivo',
    '/employes': 'Employés — Transivo',
    '/employes/:id': 'Détail Employé — Transivo',
    '/paiements-employes': 'Paiements Employés — Transivo',
    '/paiements-employes/:id': 'Détail Paiement Employé — Transivo',
    '/users': 'Utilisateurs — Transivo',
    '/users/:id': 'Détail Utilisateur — Transivo',
    '/notifications': 'Centre de Notifications — Transivo',
    '/parametres-entreprise': 'Paramètres Entreprise — Transivo',
    '/settings/company': 'Paramètres Entreprise — Transivo',
    '/platform-admin': 'Administration Plateforme — Transivo',
    '/platform-admin/companies': 'Administration Plateforme — Sociétés',
    '/platform-admin/companies/:id': 'Administration Plateforme — Détail Société',
    '/platform-admin/login': 'Connexion Administration Plateforme',
    '/platform-admin/change-password': 'Mot de passe Administration Plateforme',
    '/403': 'Accès Interdit — Transivo',
    '/404': 'Page Introuvable — Transivo',
  };

  return titles[sanitizedPath] || 'Transivo — Plateforme de Gestion de Transport';
}

/**
 * Déclenche un événement page_view propre et sécurisé vers GA4.
 */
export function trackPageView(rawPath: string): void {
  if (typeof window === 'undefined') return;
  if (!isProductionEnvironment()) return;
  if (getConsentStatus() !== 'accepted') return;

  if (!isInitialized) {
    const initialized = initGA();
    if (!initialized) return;
  }

  if (typeof window.gtag !== 'function') return;

  const sanitized = sanitizePath(rawPath);
  const safeTitle = getSafePageTitle(sanitized);
  const cleanLocation = `${PRODUCTION_ORIGIN}${sanitized}`;

  window.gtag('event', 'page_view', {
    page_path: sanitized,
    page_title: safeTitle,
    page_location: cleanLocation,
  });
}
