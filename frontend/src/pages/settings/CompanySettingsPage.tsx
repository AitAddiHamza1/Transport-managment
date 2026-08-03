import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ImageIcon from '@mui/icons-material/Image';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { useCompanySettings } from '../../features/company-settings/useCompanySettings';
import { usePermission } from '../../features/auth/usePermission';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export function CompanySettingsPage() {
  const { can } = usePermission();
  const canModify = can('parametres_entreprise', 'modifier');
  const canUploadLogo = canModify;
  const canUploadStamp = canModify;

  const {
    isConfigured,
    settings,
    isLoading,
    updateSettings,
    isUpdating,
    uploadLogo,
    isUploadingLogo,
    deleteLogo,
    isDeletingLogo,
    uploadStamp,
    isUploadingStamp,
    deleteStamp,
    isDeletingStamp,
  } = useCompanySettings();

  const [tabValue, setTabValue] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nomEntreprise: '',
    nomLegal: '',
    adresse: '',
    ville: '',
    pays: 'Maroc',
    telephone: '',
    telephoneSecondaire: '',
    email: '',
    siteWeb: '',
    ice: '',
    identifiantFiscal: '',
    registreCommerce: '',
    patente: '',
    cnss: '',
    nomBanque: '',
    rib: '',
    iban: '',
    swiftBic: '',
    tauxTvaParDefaut: 20,
    delaiPaiementParDefaut: 30,
    devise: 'MAD',
    prefixeFacture: '',
    separateurFacture: '-',
    paddingFacture: 1,
    templateFacture: 'CLASSIC_TRANSPORT',
    textePiedDePage: '',
    noteLegaleTva: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        nomEntreprise: settings.nomEntreprise || '',
        nomLegal: settings.nomLegal || '',
        adresse: settings.adresse || '',
        ville: settings.ville || '',
        pays: settings.pays || 'Maroc',
        telephone: settings.telephone || '',
        telephoneSecondaire: settings.telephoneSecondaire || '',
        email: settings.email || '',
        siteWeb: settings.siteWeb || '',
        ice: settings.ice || '',
        identifiantFiscal: settings.identifiantFiscal || '',
        registreCommerce: settings.registreCommerce || '',
        patente: settings.patente || '',
        cnss: settings.cnss || '',
        nomBanque: settings.nomBanque || '',
        rib: settings.rib || '',
        iban: settings.iban || '',
        swiftBic: settings.swiftBic || '',
        tauxTvaParDefaut: settings.tauxTvaParDefaut ?? 20,
        delaiPaiementParDefaut: settings.delaiPaiementParDefaut ?? 30,
        devise: settings.devise || 'MAD',
        prefixeFacture: settings.prefixeFacture || '',
        separateurFacture: settings.separateurFacture || '-',
        paddingFacture: settings.paddingFacture ?? 1,
        templateFacture: settings.templateFacture || 'CLASSIC_TRANSPORT',
        textePiedDePage: settings.textePiedDePage || '',
        noteLegaleTva: settings.noteLegaleTva || '',
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateSettings(formData);
      setSuccessMessage('Paramètres de l’entreprise enregistrés avec succès.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erreur lors de la sauvegarde des paramètres.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSuccessMessage(null);
      setErrorMessage(null);
      try {
        await uploadLogo(file);
        setSuccessMessage('Logo téléversé avec succès.');
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Erreur lors du téléversement du logo.');
      }
    }
  };

  const handleLogoDelete = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await deleteLogo();
      setSuccessMessage('Logo supprimé avec succès.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erreur lors de la suppression du logo.');
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSuccessMessage(null);
      setErrorMessage(null);
      try {
        await uploadStamp(file);
        setSuccessMessage('Cachet téléversé avec succès.');
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Erreur lors du téléversement du cachet.');
      }
    }
  };

  const handleStampDelete = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await deleteStamp();
      setSuccessMessage('Cachet supprimé avec succès.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erreur lors de la suppression du cachet.');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Paramètres de l’entreprise
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gérez l’identité commerciale, les coordonnées légales, les informations bancaires et l’identité visuelle de votre entreprise.
      </Typography>

      {!isConfigured && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
          <strong>Profil entreprise incomplet.</strong> Veuillez renseigner au minimum la raison sociale, l’adresse, le téléphone et l’email afin de pouvoir générer les factures PDF.
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Card elevation={2}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<BusinessIcon />} label="Informations Générales" />
              <Tab icon={<GavelIcon />} label="Informations Légales" />
              <Tab icon={<AccountBalanceIcon />} label="Informations Bancaires" />
              <Tab icon={<ReceiptIcon />} label="Préférences de Facturation" />
              <Tab icon={<ImageIcon />} label="Identité Visuelle" />
            </Tabs>
          </Box>

          <form onSubmit={handleSave}>
            <Box sx={{ p: 3 }}>
              {/* Tab 1: Informations Générales */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Raison sociale / Nom commercial *"
                      name="nomEntreprise"
                      value={formData.nomEntreprise}
                      onChange={handleChange}
                      disabled={!canModify}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Dénomination légale"
                      name="nomLegal"
                      value={formData.nomLegal}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Adresse *"
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      disabled={!canModify}
                      required
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Ville"
                      name="ville"
                      value={formData.ville}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Pays"
                      name="pays"
                      value={formData.pays}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Téléphone principal *"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      disabled={!canModify}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Téléphone secondaire"
                      name="telephoneSecondaire"
                      value={formData.telephoneSecondaire}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email commercial *"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!canModify}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Site Web"
                      name="siteWeb"
                      value={formData.siteWeb}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Tab 2: Informations Légales */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ICE (Identifiant Commun de l’Entreprise)"
                      name="ice"
                      value={formData.ice}
                      onChange={handleChange}
                      disabled={!canModify}
                      placeholder="Ex: 001584920000034"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Identifiant Fiscal (IF)"
                      name="identifiantFiscal"
                      value={formData.identifiantFiscal}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Registre de Commerce (RC)"
                      name="registreCommerce"
                      value={formData.registreCommerce}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Patente"
                      name="patente"
                      value={formData.patente}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Affiliation CNSS"
                      name="cnss"
                      value={formData.cnss}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Tab 3: Informations Bancaires */}
              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nom de la banque"
                      name="nomBanque"
                      value={formData.nomBanque}
                      onChange={handleChange}
                      disabled={!canModify}
                      placeholder="Ex: Attijariwafa Bank"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="RIB (Relevé d'Identité Bancaire)"
                      name="rib"
                      value={formData.rib}
                      onChange={handleChange}
                      disabled={!canModify}
                      placeholder="Ex: 245 780 0001234567890123 45"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="IBAN"
                      name="iban"
                      value={formData.iban}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Code SWIFT / BIC"
                      name="swiftBic"
                      value={formData.swiftBic}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Tab 4: Préférences de Facturation */}
              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Taux de TVA par défaut (%)"
                      name="tauxTvaParDefaut"
                      value={formData.tauxTvaParDefaut}
                      onChange={handleChange}
                      disabled={!canModify}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Délai de paiement (Jours)"
                      name="delaiPaiementParDefaut"
                      value={formData.delaiPaiementParDefaut}
                      onChange={handleChange}
                      disabled={!canModify}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Devise"
                      name="devise"
                      value={formData.devise}
                      onChange={handleChange}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      <strong>Format de numérotation fixe :</strong> Le format des numéros de facture est verrouillé conformément au contrat commercial (ex: <strong>F001/2026</strong>, <strong>F012/2026</strong>, <strong>F001/2027</strong>).
                    </Alert>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Préfixe Facture"
                      name="prefixeFacture"
                      value="F"
                      disabled
                      helperText="Fixe par contrat commercial (F)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Séparateur"
                      name="separateurFacture"
                      value="/"
                      disabled
                      helperText="Fixe par contrat commercial (/)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Padding Séquence"
                      name="paddingFacture"
                      value="3"
                      disabled
                      helperText="3 chiffres fixes (ex: F001/2026)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Template PDF Facture"
                      name="templateFacture"
                      value={formData.templateFacture}
                      onChange={handleChange}
                      disabled={!canModify}
                    >
                      <MenuItem value="CLASSIC_TRANSPORT">Classique transport (Gabarit standard)</MenuItem>
                      <MenuItem value="TRANSPORT_V2">Transport V2 — Modèle professionnel</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Texte Pied de Page PDF (Personnalisé)"
                      name="textePiedDePage"
                      value={formData.textePiedDePage}
                      onChange={handleChange}
                      disabled={!canModify}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Tab 5: Identité Visuelle */}
              <TabPanel value={tabValue} index={4}>
                <Grid container spacing={4}>
                  {/* Logo Section */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>
                        Logo de l'entreprise
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Affiché en haut des factures et documents officiels. Formats acceptés : PNG, JPEG (WEBP stocké mais non rendu dans les PDF).
                      </Typography>

                      <Box
                        sx={{
                          height: 140,
                          border: '1px dashed #cbd5e1',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          mb: 2,
                          overflow: 'hidden',
                        }}
                      >
                        {settings?.hasLogo ? (
                          <img
                            src="/api/company-settings/logo"
                            alt="Logo entreprise"
                            style={{ maxHeight: 120, maxWidth: '90%', objectFit: 'contain' }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Aucun logo configuré
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<UploadFileIcon />}
                          disabled={!canUploadLogo || isUploadingLogo}
                        >
                          {settings?.hasLogo ? 'Remplacer le logo' : 'Téléverser un logo'}
                          <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} />
                        </Button>
                        {settings?.hasLogo && (
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleLogoDelete}
                            disabled={!canUploadLogo || isDeletingLogo}
                          >
                            Supprimer
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  </Grid>

                  {/* Cachet Section */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>
                        Cachet / Signature de l'entreprise
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Tampon ou signature numérique (optionnel). Utilisé lors de l'exportation des factures avec cachet. Formats acceptés : PNG, JPEG (WEBP stocké mais non rendu dans les PDF).
                      </Typography>

                      <Box
                        sx={{
                          height: 140,
                          border: '1px dashed #cbd5e1',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          mb: 2,
                          overflow: 'hidden',
                        }}
                      >
                        {settings?.hasStamp ? (
                          <img
                            src="/api/company-settings/stamp"
                            alt="Cachet entreprise"
                            style={{ maxHeight: 120, maxWidth: '90%', objectFit: 'contain' }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Aucun cachet configuré
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<UploadFileIcon />}
                          disabled={!canUploadStamp || isUploadingStamp}
                        >
                          {settings?.hasStamp ? 'Remplacer le cachet' : 'Téléverser un cachet'}
                          <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={handleStampUpload} />
                        </Button>
                        {settings?.hasStamp && (
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleStampDelete}
                            disabled={!canUploadStamp || isDeletingStamp}
                          >
                            Supprimer
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              {canModify && tabValue !== 4 && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    disabled={isUpdating}
                  >
                    Enregistrer les modifications
                  </Button>
                </Box>
              )}
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
