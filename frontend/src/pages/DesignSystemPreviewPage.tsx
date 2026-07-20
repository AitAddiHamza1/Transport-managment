import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

export function DesignSystemPreviewPage() {
  const theme = useTheme();
  const [selectValue, setSelectValue] = useState('');

  // Get color values dynamically from theme so we don't hardcode them
  const colorsList = [
    { label: 'Primary Main', value: theme.palette.primary.main, color: theme.palette.primary.main, text: '#FFF' },
    { label: 'Primary Light', value: theme.palette.primary.light, color: theme.palette.primary.light, text: '#000' },
    { label: 'Primary Dark', value: theme.palette.primary.dark, color: theme.palette.primary.dark, text: '#FFF' },
    { label: 'Secondary Main', value: theme.palette.secondary.main, color: theme.palette.secondary.main, text: '#FFF' },
    { label: 'App Background', value: theme.palette.background.default, color: theme.palette.background.default, text: '#000' },
    { label: 'Surface Paper', value: theme.palette.background.paper, color: theme.palette.background.paper, text: '#000', border: true },
    { label: 'Sidebar Background', value: theme.customColors.sidebarBackground, color: theme.customColors.sidebarBackground, text: '#FFF' },
    { label: 'Sidebar Surface', value: theme.customColors.sidebarSurface, color: theme.customColors.sidebarSurface, text: '#FFF' },
    { label: 'Border Divider', value: theme.palette.divider, color: theme.palette.divider, text: '#000' },
    { label: 'Border Strong', value: theme.customColors.borderStrong, color: theme.customColors.borderStrong, text: '#000' },
    { label: 'Text Primary', value: theme.palette.text.primary, color: theme.palette.text.primary, text: '#FFF' },
    { label: 'Text Secondary', value: theme.palette.text.secondary, color: theme.palette.text.secondary, text: '#FFF' },
  ];

  const statuses = [
    { label: 'Succès', color: 'success' as const, value: theme.palette.success.main },
    { label: 'Avertissement', color: 'warning' as const, value: theme.palette.warning.main },
    { label: 'Erreur', color: 'error' as const, value: theme.palette.error.main },
    { label: 'Info', color: 'info' as const, value: theme.palette.info.main },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4, px: { xs: 2, sm: 3 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom color="text.primary">
          Système de Design — Aperçu Technique
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ce composant permet de tester et de valider visuellement les tokens de design de la Phase 1 (Couleurs, Typographies, Ombres, Radii, Boutons et Formulaires) sans affecter la logique métier de l'application ERP.
        </Typography>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Grid Container for design tokens */}
      <Grid container spacing={4}>
        
        {/* Colors Palette Section */}
        <Grid item xs={12}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Palette de Couleurs (Dynamique)
          </Typography>
          <Grid container spacing={2}>
            {colorsList.map((c, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card>
                  <Box
                    sx={{
                      height: 80,
                      bgcolor: c.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: c.text,
                      borderBottom: c.border ? `1px solid ${theme.palette.divider}` : 'none',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {c.value}
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: '12px !important' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Typography Section */}
        <Grid item xs={12}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Échelle Typographique
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: `${theme.customRadii.medium}px` }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="overline" color="text.secondary">h1 · Titre Principal (32px)</Typography>
                <Typography variant="h1">Système de Transport ERP</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">h2 · Sous-titre Majeur (28px)</Typography>
                <Typography variant="h2">Gestion de Flotte & Voyages</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">h3 · Titre de Section (24px)</Typography>
                <Typography variant="h3">Rapports Financiers Mensuels</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">h4 · Titre de Page (20px)</Typography>
                <Typography variant="h4">Liste des Conducteurs Actifs</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">h5 · Titre de Bloc (18px)</Typography>
                <Typography variant="h5">Informations du Véhicule</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">h6 · Titre de Carte / Tableau (16px)</Typography>
                <Typography variant="h6">Facture N° F-2026-089</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">body1 · Corps de texte standard ERP (14px)</Typography>
                <Typography variant="body1">
                  Ce texte utilise la taille de corps de base pour l'ERP, assurant une excellente lisibilité et densité d'informations sur les écrans de saisie de données.
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">body2 · Texte secondaire / petit (12px)</Typography>
                <Typography variant="body2">
                  Utilisé pour les textes d'aide, les descriptions courtes et les libellés secondaires.
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">caption · Légende (12px)</Typography>
                <Typography variant="caption" display="block">
                  Créé le 20/07/2026 par Admin Général
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Interactive Buttons Section */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Boutons & Actions
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: `${theme.customRadii.medium}px`, minHeight: 280 }}>
            <Stack spacing={2} direction="row" useFlexGap flexWrap="wrap">
              <Button variant="contained" color="primary">
                Action Principale
              </Button>
              <Button variant="outlined" color="primary">
                Action Secondaire
              </Button>
              <Button variant="text" color="primary">
                Lien Simple
              </Button>
              <Button variant="contained" color="error">
                Supprimer / Danger
              </Button>
              <Button variant="contained" disabled>
                Désactivé
              </Button>
              <Button variant="contained" disabled startIcon={<CircularProgress size={16} color="inherit" />}>
                Chargement...
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Les boutons ont un rayon de bordure adouci à 8px, sont en minuscules (textTransform: none), et disposent d'un effet de survol progressif.
            </Typography>
          </Paper>
        </Grid>

        {/* Form Controls Section */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Saisie & Formulaires
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: `${theme.customRadii.medium}px`, minHeight: 280 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Champ Standard"
                placeholder="Entrez du texte..."
                fullWidth
                size="small"
              />
              <TextField
                label="Champ Requis"
                required
                defaultValue="Valeur par défaut"
                fullWidth
                size="small"
              />
              <TextField
                label="Erreur de Validation"
                error
                helperText="Ce champ est obligatoire."
                defaultValue=""
                fullWidth
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel id="design-select-label">Sélection</InputLabel>
                <Select
                  labelId="design-select-label"
                  value={selectValue}
                  label="Sélection"
                  onChange={(e) => setSelectValue(e.target.value)}
                >
                  <MenuItem value="1">Option A</MenuItem>
                  <MenuItem value="2">Option B</MenuItem>
                  <MenuItem value="3">Option C</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>
        </Grid>

        {/* Chips and Status Indicators */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Badges de Statut (Chips)
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: `${theme.customRadii.medium}px`, minHeight: 180 }}>
            <Stack spacing={1.5} direction="row" useFlexGap flexWrap="wrap">
              {statuses.map((status, index) => (
                <Chip
                  key={index}
                  label={`${status.label} (${status.value})`}
                  color={status.color}
                  variant="filled"
                />
              ))}
            </Stack>
            <Box sx={{ mt: 3 }}>
              <Stack spacing={1.5} direction="row" useFlexGap flexWrap="wrap">
                {statuses.map((status, index) => (
                  <Chip
                    key={index}
                    label={status.label}
                    color={status.color}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Elevation & Radii Sandbox */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Rayons de Bordure & Ombres
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: `${theme.customRadii.medium}px`, minHeight: 180 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: `${theme.customRadii.small}px`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Petit ({theme.customRadii.small}px)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Champs, Chips
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: `${theme.customRadii.medium}px`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Moyen ({theme.customRadii.medium}px)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cartes, Blocs
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: `${theme.customRadii.large}px`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Grand ({theme.customRadii.large}px)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dialogues
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    boxShadow: theme.customShadows.card,
                    borderRadius: `${theme.customRadii.medium}px`,
                    bgcolor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Ombre de Carte
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Card Shadow
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Responsive foundations info */}
        <Grid item xs={12}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Validation Responsive
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: `${theme.customRadii.medium}px` }}>
            <Typography variant="body1" paragraph>
              Le système de design est conçu pour s'adapter automatiquement aux largeurs clés demandées :
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary.main">Mobiles (320px - 375px)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      - Espacement condensé (p: 2)<br />
                      - Formulaires en pleine largeur<br />
                      - Pas d'effets dépendant uniquement du survol<br />
                      - Boutons faciles à toucher (&gt;= 44px de hauteur)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary.main">Tablettes (768px)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      - Espacement intermédiaire (p: 2.5)<br />
                      - Passage progressif de 1 colonne à 2 colonnes<br />
                      - Prise en charge des menus repliables
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary.main">Ordinateurs (1024px+)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      - Espacement confortable (p: 3)<br />
                      - Layout multi-colonnes et larges tableaux de bord<br />
                      - Barres de navigation persistantes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}
