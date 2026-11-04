import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  getConsentStatus,
  setConsentStatus,
  type ConsentStatus,
} from '../../lib/analytics';

/**
 * Bandeau de consentement aux cookies et gestionnaire de préférences pour Transivo.
 *
 * Fonctionnalités :
 * - Conforme au Basic Consent Mode : aucun script ni tracking avant acceptation explicite.
 * - Choix mémorisé dans localStorage via la clé versionnée 'transivo_cookie_consent_v1'.
 * - Trois états gérés : 'accepted', 'rejected' et unset (null).
 * - Bouton discret persistant en bas à gauche pour réouvrir les préférences à tout moment.
 * - Interface en français, alignée sur le design system Material UI de Transivo.
 * - Ne bloque jamais le fonctionnement normal de l'application en cas de refus.
 */
export const CookieConsentBanner: React.FC = () => {
  const location = useLocation();
  const [consent, setConsent] = useState<ConsentStatus>(null);
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = getConsentStatus();
    setConsent(saved);
    setAnalyticsEnabled(saved === 'accepted');

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<ConsentStatus>;
      setConsent(customEvent.detail);
      setAnalyticsEnabled(customEvent.detail === 'accepted');
    };

    window.addEventListener('transivo-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('transivo-consent-changed', handleConsentChange);
    };
  }, []);

  // Le bandeau de consentement et son icône flottante de préférences
  // ne doivent s'afficher QUE sur la page d'accueil marketing (/).
  // Ils sont strictement masqués sur toutes les routes de l'ERP et de l'administration.
  const isLandingPage = location.pathname === '/';

  if (!isClient || !isLandingPage) {
    return null;
  }

  const handleAcceptAll = () => {
    setConsentStatus('accepted');
    setConsent('accepted');
    setAnalyticsEnabled(true);
    setDialogOpen(false);
  };

  const handleRejectAll = () => {
    setConsentStatus('rejected');
    setConsent('rejected');
    setAnalyticsEnabled(false);
    setDialogOpen(false);
  };

  const handleSaveCustom = () => {
    const finalStatus: ConsentStatus = analyticsEnabled ? 'accepted' : 'rejected';
    setConsentStatus(finalStatus);
    setConsent(finalStatus);
    setDialogOpen(false);
  };

  const showBanner = consent === null;

  return (
    <>
      {/* 1. Bandeau initial (affiché uniquement si aucune décision n'a été enregistrée) */}
      {showBanner && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 12, sm: 20 },
            left: { xs: 12, sm: 24 },
            right: { xs: 12, sm: 'auto' },
            maxWidth: { xs: '100%', sm: 540 },
            zIndex: 1300,
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2.5,
              backgroundColor: 'rgba(10, 20, 36, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
              color: '#FFFFFF',
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CookieOutlinedIcon sx={{ color: '#00E5FF', fontSize: 24 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                  Respect de votre vie privée
                </Typography>
              </Stack>

              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.5 }}>
                Transivo utilise des cookies analytiques afin de mesurer l’audience et d’améliorer
                continuellement la plateforme. Aucune donnée personnelle, financière ou métier n’est
                transmise.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                sx={{ pt: 1 }}
              >
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setDialogOpen(true)}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textTransform: 'none',
                    '&:hover': { color: '#FFFFFF', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                  }}
                >
                  Personnaliser
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRejectAll}
                  sx={{
                    color: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#FFFFFF',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  Refuser
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAcceptAll}
                  sx={{
                    backgroundColor: '#00BCD4',
                    color: '#060D1A',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { backgroundColor: '#00E5FF' },
                  }}
                >
                  Accepter
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* 2. Bouton flottant permanent pour réouvrir les préférences à tout moment */}
      {!showBanner && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1200,
          }}
        >
          <Tooltip title="Gestion des cookies" placement="right">
            <IconButton
              aria-label="Gérer les préférences de cookies"
              onClick={() => {
                setAnalyticsEnabled(consent === 'accepted');
                setDialogOpen(true);
              }}
              size="small"
              sx={{
                width: 38,
                height: 38,
                backgroundColor: 'rgba(10, 20, 36, 0.85)',
                color: consent === 'accepted' ? '#00E5FF' : 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(15, 30, 54, 0.95)',
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              <CookieOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* 3. Dialogue de personnalisation des préférences */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            backgroundColor: '#0D1B2A',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SecurityOutlinedIcon sx={{ color: '#00E5FF' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Préférences des cookies
            </Typography>
          </Stack>
          <IconButton
            aria-label="Fermer"
            onClick={() => setDialogOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: '#FFFFFF' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 2.5 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.75)', mb: 2.5 }}>
            Vous pouvez ajuster ici vos préférences relatives aux cookies utilisés sur la plateforme Transivo.
            Votre choix peut être modifié à tout moment.
          </Typography>

          <Stack spacing={2.5}>
            {/* Cookies nécessaires */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
                    Cookies techniques indispensables
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mt: 0.5 }}>
                    Nécessaires au fonctionnement du site, à l’authentification et à la sécurité de votre session.
                    Ils ne peuvent pas être désactivés.
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#00E5FF', whiteSpace: 'nowrap' }}>
                  Toujours actif
                </Typography>
              </Stack>
            </Paper>

            {/* Cookies analytiques */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box sx={{ pr: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AnalyticsOutlinedIcon sx={{ fontSize: 18, color: '#00BCD4' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
                      Mesure d’audience (Google Analytics 4)
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mt: 0.5 }}>
                    Permet d’évaluer la fréquentation et d’améliorer la stabilité de Transivo. Aucune donnée personnelle,
                    nom d’utilisateur, montant ou numéro de facture n’est enregistré.
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="text"
            onClick={handleRejectAll}
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'none',
              '&:hover': { color: '#FFFFFF' },
            }}
          >
            Tout refuser
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={handleSaveCustom}
              sx={{
                color: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                textTransform: 'none',
                '&:hover': { borderColor: '#FFFFFF' },
              }}
            >
              Enregistrer mes choix
            </Button>
            <Button
              variant="contained"
              onClick={handleAcceptAll}
              sx={{
                backgroundColor: '#00BCD4',
                color: '#060D1A',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#00E5FF' },
              }}
            >
              Tout accepter
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
