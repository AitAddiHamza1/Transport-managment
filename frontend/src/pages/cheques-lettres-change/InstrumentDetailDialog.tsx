import React, { useState, useEffect } from 'react';
import {
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
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import {
  PaymentInstrumentView,
  StatutInstrumentBancaire,
  STATUT_BANCAIRE_COLORS,
  STATUT_BANCAIRE_LABELS,
} from '../../features/cheques-lettres-change/types';
import {
  useUpdateStatutChequeMutation,
  useUpdateStatutLettreMutation,
} from '../../features/cheques-lettres-change/useChequesLettresChange';
import { chequesApi } from '../../features/cheques/chequesApi';
import { lettresDeChangeApi } from '../../features/lettres-de-change/lettresDeChangeApi';
import { useNavigate } from 'react-router-dom';

interface InstrumentDetailDialogProps {
  open: boolean;
  instrument: PaymentInstrumentView | null;
  onClose: () => void;
  onRefetch?: () => void;
}

export function InstrumentDetailDialog({
  open,
  instrument,
  onClose,
  onRefetch,
}: InstrumentDetailDialogProps) {
  const navigate = useNavigate();
  const updateChequeMutation = useUpdateStatutChequeMutation();
  const updateLettreMutation = useUpdateStatutLettreMutation();

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setDocumentUrl(null);
    setDocError(null);
    setFeedbackMsg(null);
  }, [instrument]);

  if (!instrument) return null;

  const isCheque = instrument.instrumentType === 'CHEQUE';

  const handleUpdateStatus = async (newStatus: StatutInstrumentBancaire) => {
    setFeedbackMsg(null);
    try {
      if (isCheque) {
        await updateChequeMutation.mutateAsync({
          id: instrument.id,
          payload: { statutBancaire: newStatus },
        });
      } else {
        await updateLettreMutation.mutateAsync({
          id: instrument.id,
          payload: { statutBancaire: newStatus },
        });
      }
      setFeedbackMsg({
        type: 'success',
        message: `Statut bancaire mis à jour : "${STATUT_BANCAIRE_LABELS[newStatus]}". (Aucun doublon financier créé).`,
      });
      if (onRefetch) onRefetch();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        message: err?.response?.data?.message || 'Erreur lors de la mise à jour du statut bancaire',
      });
    }
  };

  const handlePreviewDocument = async () => {
    setIsLoadingDoc(true);
    setDocError(null);
    try {
      let blobUrl = '';
      if (isCheque) {
        blobUrl = await chequesApi.viewDocumentFile(instrument.id);
      } else {
        blobUrl = await lettresDeChangeApi.viewDocumentFile(instrument.id);
      }
      setDocumentUrl(blobUrl);
    } catch (err) {
      setDocError('Impossible de charger le document scanné.');
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleDownloadDocument = async () => {
    try {
      if (isCheque) {
        await chequesApi.downloadDocument(instrument.id, `chq-${instrument.numero}`);
      } else {
        await lettresDeChangeApi.downloadDocument(instrument.id, `lc-${instrument.numero}`);
      }
    } catch (err) {
      alert('Erreur lors du téléchargement du fichier.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedbackMsg(null);
    try {
      if (isCheque) {
        await chequesApi.uploadDocument(instrument.id, file);
      } else {
        await lettresDeChangeApi.uploadDocument(instrument.id, file);
      }
      setFeedbackMsg({
        type: 'success',
        message: 'Scan du document téléversé avec succès.',
      });
      if (onRefetch) onRefetch();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        message: err?.response?.data?.message || 'Erreur lors du téléversement du document',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer le justificatif attaché ?')) return;

    setFeedbackMsg(null);
    try {
      if (isCheque) {
        await chequesApi.removeDocument(instrument.id);
      } else {
        await lettresDeChangeApi.removeDocument(instrument.id);
      }
      setDocumentUrl(null);
      setFeedbackMsg({
        type: 'success',
        message: 'Document supprimé avec succès. L’enregistrement financier reste 100% intact.',
      });
      if (onRefetch) onRefetch();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        message: err?.response?.data?.message || 'Erreur lors de la suppression du document',
      });
    }
  };

  const handleGoToOriginalPayment = () => {
    onClose();
    if (instrument.source === 'CLIENT') {
      navigate('/paiements-clients');
    } else {
      navigate('/paiements-fournisseurs');
    }
  };

  const numAmount = instrument.montant;
  const formattedAmount = !isNaN(numAmount)
    ? numAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Fiche {isCheque ? 'Chèque' : 'Lettre de Change'} #{instrument.numero}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Réf transaction : {instrument.paymentReference} ({instrument.source === 'CLIENT' ? 'Paiement Client' : 'Paiement Fournisseur'})
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {feedbackMsg && (
          <Alert severity={feedbackMsg.type} sx={{ mb: 2 }} onClose={() => setFeedbackMsg(null)}>
            {feedbackMsg.message}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Main Info Box */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                Information de l'instrument
              </Typography>
              <Divider sx={{ mb: 1.5 }} />

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Type d'instrument :
                  </Typography>
                  <Chip
                    label={isCheque ? 'Chèque' : 'Lettre de Change'}
                    size="small"
                    color={isCheque ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    N° Instrument :
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {instrument.numero}
                  </Typography>
                </Stack>

                {isCheque && instrument.serie && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Série :
                    </Typography>
                    <Typography variant="body2">{instrument.serie}</Typography>
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {isCheque ? 'Date du chèque :' : "Date d'échéance :"}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {instrument.date ? new Date(instrument.date).toLocaleDateString('fr-FR') : 'N/A'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Montant :
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={instrument.direction === 'IN' ? 'success.main' : 'warning.main'}
                  >
                    {instrument.direction === 'IN' ? '+' : '-'} {formattedAmount} {instrument.devise}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Bénéficiaire :
                  </Typography>
                  <Typography variant="body2">{instrument.beneficiaire || 'N/A'}</Typography>
                </Stack>

                {isCheque ? (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Banque :
                      </Typography>
                      <Typography variant="body2">{instrument.banque || 'N/A'}</Typography>
                    </Stack>
                    {instrument.agence && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Agence :
                        </Typography>
                        <Typography variant="body2">{instrument.agence}</Typography>
                      </Stack>
                    )}
                    {instrument.ville && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Ville :
                        </Typography>
                        <Typography variant="body2">{instrument.ville}</Typography>
                      </Stack>
                    )}
                  </>
                ) : (
                  <>
                    {instrument.cause && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Cause :
                        </Typography>
                        <Typography variant="body2">{instrument.cause}</Typography>
                      </Stack>
                    )}
                    {instrument.tireNom && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Tiré (Nom) :
                        </Typography>
                        <Typography variant="body2">{instrument.tireNom}</Typography>
                      </Stack>
                    )}
                    {instrument.tireAdresse && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Tiré (Adresse) :
                        </Typography>
                        <Typography variant="body2">{instrument.tireAdresse}</Typography>
                      </Stack>
                    )}
                  </>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Context & Banking Status Box */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                Tiers & Origine Financière
              </Typography>
              <Divider sx={{ mb: 1.5 }} />

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Tiers ({instrument.source}) :
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {instrument.partyName}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Paiement d'origine :
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    onClick={handleGoToOriginalPayment}
                  >
                    {instrument.paymentReference}
                  </Button>
                </Stack>

                <Divider />

                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mt: 1 }}>
                  Statut du Suivi Bancaire
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={STATUT_BANCAIRE_LABELS[instrument.statutBancaire] || instrument.statutBancaire}
                    color={STATUT_BANCAIRE_COLORS[instrument.statutBancaire]}
                    size="medium"
                  />
                  {instrument.isPaymentCancelled && (
                    <Chip label="Paiement Annulé" color="error" variant="outlined" size="small" />
                  )}
                </Box>

                {/* Transition Action Buttons */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Actions de changement de statut bancaire :
                </Typography>

                <Grid container spacing={1}>
                  {instrument.statutBancaire !== 'DEPOSE_EN_BANQUE' && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="info"
                        startIcon={<AccountBalanceIcon />}
                        onClick={() => handleUpdateStatus('DEPOSE_EN_BANQUE')}
                        disabled={updateChequeMutation.isPending || updateLettreMutation.isPending}
                      >
                        Déposer en banque
                      </Button>
                    </Grid>
                  )}

                  {instrument.statutBancaire !== 'ENCAISSE' && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleUpdateStatus('ENCAISSE')}
                        disabled={updateChequeMutation.isPending || updateLettreMutation.isPending}
                      >
                        Encaissé
                      </Button>
                    </Grid>
                  )}

                  {instrument.statutBancaire !== 'REJETE_IMPAYE' && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<ErrorOutlineIcon />}
                        onClick={() => handleUpdateStatus('REJETE_IMPAYE')}
                        disabled={updateChequeMutation.isPending || updateLettreMutation.isPending}
                      >
                        Rejeté / Impayé
                      </Button>
                    </Grid>
                  )}

                  {instrument.statutBancaire !== 'ANNULE' && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<CancelIcon />}
                        onClick={() => handleUpdateStatus('ANNULE')}
                        disabled={updateChequeMutation.isPending || updateLettreMutation.isPending}
                      >
                        Annulé
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Stack>
            </Paper>
          </Grid>

          {/* Document Section */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="primary" fontWeight="bold">
                  Justificatif Scanné
                </Typography>
                <Stack direction="row" spacing={1}>
                  {instrument.hasDocument ? (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={handlePreviewDocument}
                        disabled={isLoadingDoc}
                      >
                        {isLoadingDoc ? <CircularProgress size={16} /> : 'Aperçu'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadDocument}
                      >
                        Télécharger
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDeleteDocument}
                      >
                        Supprimer
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      component="label"
                      startIcon={<UploadFileIcon />}
                      disabled={isUploading}
                    >
                      {isUploading ? <CircularProgress size={16} color="inherit" /> : 'Téléverser le scan'}
                      <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileUpload} />
                    </Button>
                  )}
                </Stack>
              </Stack>

              {docError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {docError}
                </Alert>
              )}

              {documentUrl && (
                <Box sx={{ mt: 2, textAlign: 'center', backgroundColor: '#f8fafc', p: 1, borderRadius: 1 }}>
                  <iframe
                    src={documentUrl}
                    title="Scan Document Preview"
                    width="100%"
                    height="400px"
                    style={{ border: 'none', borderRadius: '4px' }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
