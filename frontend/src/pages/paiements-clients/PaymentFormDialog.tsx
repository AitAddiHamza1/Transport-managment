import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect, useMemo } from 'react';
import { useCreancesQuery } from '../../features/creances/useCreances';
import {
  useCreatePaiementClient,
  useForexRateQuery,
} from '../../features/paiements-clients/usePaiementsClients';
import { lettresDeChangeApi } from '../../features/lettres-de-change/lettresDeChangeApi';
import { chequesApi } from '../../features/cheques/chequesApi';
import { ChequeFormFields } from '../../components/cheques/ChequeFormFields';
import { notify } from '../../utils/notify';
import type { CreanceClient } from '../../features/creances/types';
import type {
  CreatePaiementClientPayload,
  PaiementMethode,
} from '../../features/paiements-clients/types';

interface PaymentFormDialogProps {
  open: boolean;
  preselectedNumeroFacture?: string;
  onClose: () => void;
}

const METHODES: { value: PaiementMethode; label: string }[] = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'EFFET', label: 'Lettre de change' },
  { value: 'PRELEVEMENT', label: 'Prélèvement automatique' },
];

export function PaymentFormDialog({
  open,
  preselectedNumeroFacture,
  onClose,
}: PaymentFormDialogProps) {
  // Query unpaid receivables for dropdown selection
  const { data: creancesData, isLoading: isLoadingCreances } = useCreancesQuery({
    limit: 100,
  });

  const activeCreances = useMemo(() => {
    return (creancesData?.data || []).filter(
      (c: CreanceClient) => c.statutPaiement !== 'PAYE' && c.solde > 0,
    );
  }, [creancesData]);

  // Form state
  const [selectedNumeroFacture, setSelectedNumeroFacture] = useState<string>('');
  const [montantRecu, setMontantRecu] = useState<string>('');
  const [methodePaiement, setMethodePaiement] = useState<PaiementMethode>('VIREMENT');
  const [datePaiement, setDatePaiement] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // Phase 7F Forex State
  const [rateMode, setRateMode] = useState<'automatic' | 'manual'>('automatic');
  const [manualTauxChange, setManualTauxChange] = useState<string>('');

  // Cheque fields
  const [chequeNumero, setChequeNumero] = useState<string>('');
  const [chequeSerie, setChequeSerie] = useState<string>('');
  const [chequeDateCheque, setChequeDateCheque] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [chequeBanque, setChequeBanque] = useState<string>('');
  const [chequeAgence, setChequeAgence] = useState<string>('');
  const [chequeBeneficiaire, setChequeBeneficiaire] = useState<string>('');
  const [chequeVille, setChequeVille] = useState<string>('');
  const [selectedChequeFile, setSelectedChequeFile] = useState<File | null>(null);

  // Lettre de change fields
  const [lettreNumero, setLettreNumero] = useState<string>('');
  const [lettreDateEcheance, setLettreDateEcheance] = useState<string>('');
  const [lettreMontant, setLettreMontant] = useState<string>('');
  const [lettreBeneficiaire, setLettreBeneficiaire] = useState<string>('');
  const [lettreCause, setLettreCause] = useState<string>('');
  const [lettreTireNom, setLettreTireNom] = useState<string>('');
  const [lettreTireAdresse, setLettreTireAdresse] = useState<string>('');
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreatePaiementClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      notify.error(`Fichier "${file.name}" rejeté. Formats acceptés : PDF, JPEG, PNG, WEBP`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(`Fichier "${file.name}" trop volumineux (max 5 Mo)`);
      return;
    }

    setSelectedDocumentFile(file);
  };

  // Find currently selected receivable
  const selectedCreance = useMemo(() => {
    return (creancesData?.data || []).find(
      (c: CreanceClient) => c.numeroFacture.toUpperCase() === selectedNumeroFacture.toUpperCase(),
    );
  }, [creancesData, selectedNumeroFacture]);

  const isEur = selectedCreance?.devise === 'EUR';

  // Query external BAM rate via backend preview endpoint
  const {
    data: forexData,
    isLoading: isLoadingForex,
    isError: isErrorForex,
    refetch: refetchForex,
  } = useForexRateQuery(datePaiement, open && isEur && rateMode === 'automatic');

  // Reset/Clear LC and Cheque fields when mode changes
  useEffect(() => {
    setLettreNumero('');
    setLettreDateEcheance('');
    setLettreMontant('');
    setLettreBeneficiaire('');
    setLettreCause('');
    setLettreTireNom('');
    setLettreTireAdresse('');
    setSelectedDocumentFile(null);

    setChequeNumero('');
    setChequeSerie('');
    setChequeDateCheque(new Date().toISOString().split('T')[0]);
    setChequeBanque('');
    setChequeAgence('');
    setChequeBeneficiaire('');
    setChequeVille('');
    setSelectedChequeFile(null);
  }, [methodePaiement]);

  // Reset Forex state when switching invoices or closing
  useEffect(() => {
    setRateMode('automatic');
    setManualTauxChange('');
  }, [selectedNumeroFacture, open]);

  // Sync preselected invoice
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setDatePaiement(new Date().toISOString().split('T')[0]);
      setRateMode('automatic');
      setManualTauxChange('');
      if (preselectedNumeroFacture) {
        setSelectedNumeroFacture(preselectedNumeroFacture);
      } else if (activeCreances.length > 0) {
        setSelectedNumeroFacture(activeCreances[0].numeroFacture);
      } else {
        setSelectedNumeroFacture('');
      }
      setMontantRecu('');
      setMethodePaiement('VIREMENT');
    }
  }, [open, preselectedNumeroFacture, activeCreances]);

  // Financial calculations
  const parsedAmount = parseFloat(montantRecu) || 0;
  const currentSolde = selectedCreance?.solde ?? 0;
  const remainingAfterPayment = Math.max(0, currentSolde - parsedAmount);
  const isOverpaid = selectedCreance ? parsedAmount > currentSolde + 0.001 : false;
  const isInvalidAmount = parsedAmount <= 0 || isNaN(parsedAmount);

  // Effective Exchange Rate calculation
  const effectiveTaux =
    rateMode === 'manual'
      ? parseFloat(manualTauxChange) || 0
      : (forexData?.rate ?? 0);

  const isInvalidTaux = isEur && (effectiveTaux <= 0 || isNaN(effectiveTaux));

  // Live EUR -> MAD preview calculation (display only)
  const montantConvertiMad =
    isEur && parsedAmount > 0 && effectiveTaux > 0
      ? Math.round(parsedAmount * effectiveTaux * 100) / 100
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedNumeroFacture) {
      setErrorMessage('Veuillez sélectionner une facture');
      return;
    }

    if (isInvalidAmount) {
      setErrorMessage('Le montant du règlement doit être un nombre supérieur à 0');
      return;
    }

    if (isEur && isInvalidTaux) {
      setErrorMessage('Veuillez saisir un taux de change valide supérieur à 0');
      return;
    }

    if (isOverpaid) {
      const selectedCurrency = selectedCreance?.devise || 'MAD';
      setErrorMessage(
        `Le montant saisi (${parsedAmount.toLocaleString()} ${selectedCurrency}) dépasse le solde restant de la créance (${currentSolde.toLocaleString()} ${selectedCurrency})`,
      );
      return;
    }

    if (methodePaiement === 'CHEQUE') {
      if (!chequeNumero.trim()) return setErrorMessage('Le numéro du chèque est requis');
      if (!chequeDateCheque) return setErrorMessage('La date du chèque est requise');
      if (!chequeBanque.trim()) return setErrorMessage('La banque est requise');
      if (!chequeBeneficiaire.trim()) return setErrorMessage('Le bénéficiaire est requis');
    }

    if (methodePaiement === 'EFFET') {
      if (!lettreNumero.trim()) return setErrorMessage('Le numéro de lettre de change est requis');
      if (!lettreDateEcheance) return setErrorMessage('La date d écheance est requise');
      if (!lettreMontant || parseFloat(lettreMontant) <= 0)
        return setErrorMessage(
          'Le montant en chiffres est requis et doit être supérieur à 0',
        );
      if (!lettreBeneficiaire.trim()) return setErrorMessage('Le bénéficiaire est requis');
      if (!lettreCause.trim()) return setErrorMessage('La cause est requise');
      if (!lettreTireNom.trim()) return setErrorMessage('Le nom du tiré est requis');
      if (!lettreTireAdresse.trim()) return setErrorMessage('L adresse du tiré est requise');
    }

    try {
      // Build clean payload
      const payload: CreatePaiementClientPayload = {
        numeroFacture: selectedNumeroFacture,
        nomClient: selectedCreance?.nomClient,
        datePaiement,
        montantRecu: parsedAmount,
        methodePaiement,
        devise: selectedCreance?.devise || 'MAD',
        tauxChange: isEur && rateMode === 'manual' ? effectiveTaux : undefined,
        chequeNumero: methodePaiement === 'CHEQUE' ? chequeNumero.trim() : undefined,
        chequeSerie: methodePaiement === 'CHEQUE' ? chequeSerie.trim() || undefined : undefined,
        chequeDateCheque: methodePaiement === 'CHEQUE' ? chequeDateCheque : undefined,
        chequeBanque: methodePaiement === 'CHEQUE' ? chequeBanque.trim() : undefined,
        chequeAgence: methodePaiement === 'CHEQUE' ? chequeAgence.trim() || undefined : undefined,
        chequeBeneficiaire: methodePaiement === 'CHEQUE' ? chequeBeneficiaire.trim() : undefined,
        chequeVille: methodePaiement === 'CHEQUE' ? chequeVille.trim() || undefined : undefined,
        lettreNumero: methodePaiement === 'EFFET' ? lettreNumero.trim() : undefined,
        lettreDateEcheance: methodePaiement === 'EFFET' ? lettreDateEcheance : undefined,
        lettreMontant: methodePaiement === 'EFFET' ? parseFloat(lettreMontant) : undefined,
        lettreBeneficiaire: methodePaiement === 'EFFET' ? lettreBeneficiaire.trim() : undefined,
        lettreCause: methodePaiement === 'EFFET' ? lettreCause.trim() : undefined,
        lettreTireNom: methodePaiement === 'EFFET' ? lettreTireNom.trim() : undefined,
        lettreTireAdresse: methodePaiement === 'EFFET' ? lettreTireAdresse.trim() : undefined,
      };

      const createdPayment = await createMutation.mutateAsync(payload);

      if (selectedChequeFile && methodePaiement === 'CHEQUE' && createdPayment?.cheque?.id) {
        try {
          await chequesApi.uploadDocument(createdPayment.cheque.id, selectedChequeFile);
          notify.success('Document du chèque téléversé avec succès');
        } catch (docErr: any) {
          const msg =
            docErr?.response?.data?.message ||
            "Le paiement a été enregistré, mais le document du chèque n'a pas pu être ajouté.";
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      }

      if (selectedDocumentFile && methodePaiement === 'EFFET' && createdPayment?.lettreDeChange?.id) {
        try {
          await lettresDeChangeApi.uploadDocument(createdPayment.lettreDeChange.id, selectedDocumentFile);
          notify.success('Document de la lettre de change téléversé avec succès');
        } catch (docErr: any) {
          const msg = docErr.response?.data?.message || 'Règlement créé mais échec du transfert du document de la lettre de change';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      }

      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de l’enregistrement du règlement.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };


  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      component="form"
      onSubmit={handleSubmit}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Enregistrer un règlement client</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          {/* Invoice Selection */}
          <Autocomplete
            options={activeCreances}
            getOptionLabel={(option) =>
              `${option.numeroFacture} — ${option.nomClient} (Solde: ${option.solde.toLocaleString()} ${option.devise || 'MAD'})`
            }
            value={selectedCreance || null}
            onChange={(_, newValue) => {
              if (newValue) {
                setSelectedNumeroFacture(newValue.numeroFacture);
                setMontantRecu(newValue.solde.toString());
              } else {
                setSelectedNumeroFacture('');
                setMontantRecu('');
              }
            }}
            loading={isLoadingCreances}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Facture / Créance à régler *"
                placeholder="Sélectionnez une facture..."
                fullWidth
                size="small"
              />
            )}
          />

          {/* Live Financial Card */}
          {selectedCreance && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {selectedCreance.nomClient}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Montant Facture TTC
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {selectedCreance.montantFacture.toLocaleString()} {selectedCreance.devise || 'MAD'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Déjà encaissé
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="success.main">
                    {selectedCreance.montantRecu.toLocaleString()} {selectedCreance.devise || 'MAD'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Solde actuel à régler
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="error.main">
                    {currentSolde.toLocaleString()} {selectedCreance.devise || 'MAD'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Payment Form Fields */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={`Montant reçu (${selectedCreance?.devise || 'MAD'}) *`}
                type="number"
                value={montantRecu}
                onChange={(e) => setMontantRecu(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ step: '0.01', min: '0.01' }}
                error={isOverpaid}
                helperText={isOverpaid ? 'Montant supérieur au solde !' : ''}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Mode de règlement *"
                value={methodePaiement}
                onChange={(e) => setMethodePaiement(e.target.value as PaiementMethode)}
                fullWidth
                size="small"
              >
                {METHODES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Date du règlement *"
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Phase 7F EUR -> MAD Exchange Rate Section */}
            {isEur && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    borderColor: 'info.main',
                  }}
                >
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <CurrencyExchangeIcon color="info" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={700} color="info.main">
                          Conversion EUR → MAD
                        </Typography>
                      </Box>
                      <Chip
                        label={rateMode === 'manual' ? 'Taux manuel' : 'Taux automatique (BAM)'}
                        color={rateMode === 'manual' ? 'warning' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {isLoadingForex && rateMode === 'automatic' && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Récupération du taux EUR → MAD...
                        </Typography>
                      </Box>
                    )}

                    {isErrorForex && rateMode === 'automatic' && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        Impossible de récupérer le taux de change automatiquement. Veuillez saisir un taux manuel.
                      </Alert>
                    )}

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Taux de change EUR → MAD *"
                          type="number"
                          value={
                            rateMode === 'manual'
                              ? manualTauxChange
                              : isLoadingForex
                              ? ''
                              : forexData?.rate?.toString() || ''
                          }
                          onChange={(e) => {
                            setRateMode('manual');
                            setManualTauxChange(e.target.value);
                          }}
                          fullWidth
                          size="small"
                          inputProps={{ step: '0.0001', min: '0.0001' }}
                          error={isInvalidTaux}
                          helperText={
                            isInvalidTaux
                              ? 'Taux invalide !'
                              : rateMode === 'manual'
                              ? 'Taux personnalisé saisi par l’utilisateur'
                              : forexData?.date
                              ? `Taux officiel Bank Al-Maghrib${
                                  forexData.date !== datePaiement
                                    ? ` (Publié le ${forexData.date})`
                                    : ''
                                }`
                              : 'Taux officiel'
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Montant converti en MAD"
                          value={
                            montantConvertiMad !== null
                              ? `${montantConvertiMad.toLocaleString('fr-FR', {
                                  minimumFractionDigits: 2,
                                })} MAD`
                              : '—'
                          }
                          fullWidth
                          size="small"
                          InputProps={{ readOnly: true }}
                          helperText={
                            parsedAmount > 0 && effectiveTaux > 0
                              ? `Calculé : ${parsedAmount.toLocaleString('fr-FR')} EUR × ${effectiveTaux}`
                              : 'Saisissez le montant et le taux'
                          }
                        />
                      </Grid>
                    </Grid>

                    {rateMode === 'manual' && (
                      <Box display="flex" justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="text"
                          color="info"
                          startIcon={<RefreshIcon fontSize="small" />}
                          onClick={() => {
                            setRateMode('automatic');
                            setManualTauxChange('');
                            refetchForex();
                          }}
                        >
                          Rétablir le taux automatique
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Cheque Section */}
          {methodePaiement === 'CHEQUE' && (
            <ChequeFormFields
              numero={chequeNumero}
              setNumero={setChequeNumero}
              serie={chequeSerie}
              setSerie={setChequeSerie}
              dateCheque={chequeDateCheque}
              setDateCheque={setChequeDateCheque}
              banque={chequeBanque}
              setBanque={setChequeBanque}
              agence={chequeAgence}
              setAgence={setChequeAgence}
              beneficiaire={chequeBeneficiaire}
              setBeneficiaire={setChequeBeneficiaire}
              ville={chequeVille}
              setVille={setChequeVille}
              selectedFile={selectedChequeFile}
              setSelectedFile={setSelectedChequeFile}
            />
          )}

          {/* Lettre de change Section */}
          {methodePaiement === 'EFFET' && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                borderColor: 'primary.light',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="primary.main"
                gutterBottom
              >
                Informations — Lettre de change
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    label="N° Lettre de change"
                    value={lettreNumero}
                    onChange={(e) => setLettreNumero(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    label="Date d'échéance"
                    type="date"
                    value={lettreDateEcheance}
                    onChange={(e) => setLettreDateEcheance(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    label={`Montant en chiffres (${selectedCreance?.devise || 'MAD'})`}
                    type="number"
                    value={lettreMontant}
                    onChange={(e) => setLettreMontant(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ step: '0.01', min: '0.01' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    label="Bénéficiaire"
                    value={lettreBeneficiaire}
                    onChange={(e) => setLettreBeneficiaire(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    label="Cause"
                    value={lettreCause}
                    onChange={(e) => setLettreCause(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    label="Tiré — Nom"
                    value={lettreTireNom}
                    onChange={(e) => setLettreTireNom(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    label="Tiré — Adresse"
                    value={lettreTireAdresse}
                    onChange={(e) => setLettreTireAdresse(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>

                {/* Document de la lettre de change */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
                    Document de la lettre de change (Optionnel)
                  </Typography>
                  {!selectedDocumentFile ? (
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      size="small"
                    >
                      Ajouter un document (PDF, JPEG, PNG, WEBP, max 5 Mo)
                      <input
                        type="file"
                        hidden
                        accept=".pdf,.jpeg,.jpg,.png,.webp"
                        onChange={handleFileSelect}
                      />
                    </Button>
                  ) : (
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ p: 1, border: '1px dashed #ccc', borderRadius: 1 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AttachFileIcon fontSize="small" color="primary" />
                        <Typography variant="body2">{selectedDocumentFile.name}</Typography>
                        <Chip
                          label={`${(selectedDocumentFile.size / 1024).toFixed(0)} Ko`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setSelectedDocumentFile(null)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Live Remaining Balance Preview */}
          {selectedCreance && parsedAmount > 0 && !isOverpaid && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                Nouveau solde après ce règlement :{' '}
                <strong>
                  {remainingAfterPayment.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  {selectedCreance.devise || 'MAD'}
                </strong>
                {remainingAfterPayment === 0 && ' (Créance intégralement réglée)'}
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={createMutation.isPending}>
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={
            createMutation.isPending ||
            isOverpaid ||
            isInvalidAmount ||
            !selectedNumeroFacture ||
            (isEur && isInvalidTaux)
          }
          startIcon={
            createMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : null
          }
        >
          {createMutation.isPending ? 'Enregistrement...' : 'Valider le règlement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
