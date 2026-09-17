import {
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { usePaiementClientDetail } from '../../features/paiements-clients/usePaiementsClients';
import {
  useDeleteLettreDeChangeDocument,
  useLettreDeChangeDocumentQuery,
  useUploadLettreDeChangeDocument,
} from '../../features/lettres-de-change/useLettresDeChange';
import { lettresDeChangeApi } from '../../features/lettres-de-change/lettresDeChangeApi';
import { notify } from '../../utils/notify';
import { Can } from '../../components/shared/Can';
import { ChequeDetailSection } from '../../components/cheques/ChequeDetailSection';

interface PaymentDetailDialogProps {
  open: boolean;
  paymentId: number | null;
  onClose: () => void;
}

export function PaymentDetailDialog({ open, paymentId, onClose }: PaymentDetailDialogProps) {
  const { data: paiement, isLoading } = usePaiementClientDetail(paymentId);

  const idLettreDeChange = paiement?.lettreDeChange?.id || null;
  const { data: documentMeta } = useLettreDeChangeDocumentQuery(idLettreDeChange);

  const uploadDocMutation = useUploadLettreDeChangeDocument();
  const deleteDocMutation = useDeleteLettreDeChangeDocument();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !idLettreDeChange) return;
    const file = event.target.files[0];
    if (!file) return;

    try {
      await uploadDocMutation.mutateAsync({ idLettreDeChange, file });
    } catch (_) {}
  };

  const handleDeleteDoc = async () => {
    if (!idLettreDeChange) return;
    try {
      await deleteDocMutation.mutateAsync(idLettreDeChange);
    } catch (_) {}
  };

  const handleDownloadDoc = async () => {
    if (!idLettreDeChange) return;
    try {
      await lettresDeChangeApi.downloadDocument(
        idLettreDeChange,
        documentMeta?.nomOriginal || `lettre-de-change-${idLettreDeChange}`,
      );
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    }
  };

  const handleViewDoc = async () => {
    if (!idLettreDeChange) return;
    try {
      const blobUrl = await lettresDeChangeApi.viewDocumentFile(idLettreDeChange);
      window.open(blobUrl, '_blank');
    } catch (_) {
      notify.error('Erreur lors de l\'ouverture du document');
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Règlement client REG-{(paymentId ?? 0).toString().padStart(4, '0')}
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : paiement ? (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">
                Montant réglé
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>
                {paiement.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paiement.devise || 'MAD'}
              </Typography>
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  N° Facture
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {paiement.numeroFacture}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {paiement.nomClient}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Date de règlement
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {paiement.datePaiement}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Mode de règlement
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={
                      paiement.methodePaiement === 'EFFET'
                        ? 'Lettre de change'
                        : paiement.methodePaiement === 'CHEQUE'
                        ? 'Chèque'
                        : paiement.methodePaiement
                    }
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Grid>
            </Grid>

            {paiement.devise === 'EUR' && paiement.tauxChange && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'info.light' }}>
                <Typography variant="subtitle2" fontWeight={700} color="info.main" gutterBottom>
                  Conversion devise — EUR → MAD
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Taux de change
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {paiement.tauxChange}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Source du taux
                    </Typography>
                    <Box sx={{ mt: 0.2 }}>
                      <Chip
                        label={paiement.estTauxManuel ? 'Taux manuel' : 'Bank Al-Maghrib'}
                        color={paiement.estTauxManuel ? 'warning' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Montant converti (MAD)
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="info.main">
                      {paiement.montantConvertiMad
                        ? `${paiement.montantConvertiMad.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                        : '—'}
                    </Typography>
                  </Grid>
                  {paiement.dateTauxUtilise && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Date publication du taux
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {paiement.dateTauxUtilise}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {paiement.cheque && <ChequeDetailSection cheque={paiement.cheque} />}


            {paiement.methodePaiement === 'EFFET' && paiement.lettreDeChange && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'primary.light' }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                  Informations — Lettre de change
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">N°</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.numero}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Échéance</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.dateEcheance}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Montant en chiffres</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {paiement.lettreDeChange.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paiement.devise || 'MAD'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Bénéficiaire</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.beneficiaire}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Cause</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.cause}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Tiré</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.tireNom}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Adresse du tiré</Typography>
                    <Typography variant="body2" fontWeight={600}>{paiement.lettreDeChange.tireAdresse}</Typography>
                  </Grid>

                  {/* Document de la lettre de change section */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Document de la lettre de change
                    </Typography>

                    {documentMeta?.hasDocument ? (
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ p: 1.5, border: '1px solid', borderColor: 'primary.light', borderRadius: 1.5, bgcolor: 'background.paper' }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <AttachFileIcon color="primary" />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {documentMeta.nomOriginal || 'Scan lettre de change'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {documentMeta.mimeType} •{' '}
                              {documentMeta.tailleFichier ? `${(documentMeta.tailleFichier / 1024).toFixed(0)} Ko` : ''}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" title="Visualiser" onClick={handleViewDoc}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" title="Télécharger" onClick={handleDownloadDoc}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                          <Can module="gestion_paiements" action="modifier">
                            <IconButton
                              size="small"
                              color="error"
                              title="Supprimer"
                              onClick={handleDeleteDoc}
                              disabled={deleteDocMutation.isPending}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Can>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Aucun document joint à cette lettre de change.
                        </Typography>
                        <Can module="gestion_paiements" action="modifier">
                          <Button
                            variant="outlined"
                            size="small"
                            component="label"
                            startIcon={uploadDocMutation.isPending ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                            disabled={uploadDocMutation.isPending || !idLettreDeChange}
                          >
                            Ajouter un document
                            <input
                              type="file"
                              hidden
                              accept=".pdf,.jpeg,.jpg,.png,.webp"
                              onChange={handleFileUpload}
                            />
                          </Button>
                        </Can>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            )}

            {paiement.creance && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  État de la créance après ce règlement
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Solde restant : {paiement.creance.solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paiement.devise || 'MAD'}
                  </Typography>
                  <Chip
                    label={paiement.creance.statutPaiement === 'PAYE' ? 'Réglé' : 'Partiel'}
                    color={paiement.creance.statutPaiement === 'PAYE' ? 'success' : 'warning'}
                    size="small"
                  />
                </Stack>
              </Paper>
            )}
          </Stack>
        ) : (
          <Typography variant="body1" color="error">
            Règlement introuvable.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
