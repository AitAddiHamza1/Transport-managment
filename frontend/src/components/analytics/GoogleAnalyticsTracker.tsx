import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  initGA,
  trackPageView,
  sanitizePath,
  getConsentStatus,
  isProductionEnvironment,
} from '../../lib/analytics';

/**
 * Composant de suivi de navigation SPA pour Google Analytics 4.
 *
 * Fonctionnalités :
 * - Placé sous BrowserRouter dans App.tsx pour capter toutes les navigations (Landing, Auth, ERP, Platform Admin).
 * - Empêche les événements page_view en double (notamment en environnement React StrictMode).
 * - Ne s'exécute que si l'environnement est en production sur transivo.tech et si le consentement est donné.
 * - Réagit instantanément à l'octroi de consentement via l'événement 'transivo-consent-changed'.
 * - Garantit qu'aucun query parameter ou hash fragment n'est transmis.
 */
export const GoogleAnalyticsTracker: React.FC = () => {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Si nous ne sommes pas en production sur le domaine officiel, le tracker reste totalement inactif
    if (!isProductionEnvironment()) {
      return;
    }

    const consent = getConsentStatus();
    if (consent === 'accepted') {
      initGA();
    }

    const trackCurrentRoute = () => {
      if (getConsentStatus() !== 'accepted') {
        return;
      }

      const sanitized = sanitizePath(location.pathname);

      // Prévention des doublons : si le chemin assaini est identique au dernier envoyé, on ignore
      if (lastTrackedPathRef.current === sanitized) {
        return;
      }

      lastTrackedPathRef.current = sanitized;
      trackPageView(location.pathname);
    };

    trackCurrentRoute();

    // Écoute des changements de consentement pour déclencher le premier page_view dès acceptation
    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<'accepted' | 'rejected'>;
      if (customEvent.detail === 'accepted') {
        initGA();
        lastTrackedPathRef.current = null;
        trackCurrentRoute();
      } else {
        lastTrackedPathRef.current = null;
      }
    };

    window.addEventListener('transivo-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('transivo-consent-changed', handleConsentChange);
    };
  }, [location.pathname]);

  return null;
};

export default GoogleAnalyticsTracker;
