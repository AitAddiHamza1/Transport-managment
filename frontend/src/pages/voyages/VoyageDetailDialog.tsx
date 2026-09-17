import {
  Avatar,
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
import RouteIcon from '@mui/icons-material/Route';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {
  useDeleteVoyageDocument,
  useUploadVoyageDocuments,
  useVoyageDocumentsQuery,
  useVoyageFraisQuery,
  useVoyageQuery,
} from '../../features/voyages/useVoyages';
import { DocumentVoyage, VoyageStatut } from '../../features/voyages/types';
import { voyagesApi } from '../../features/voyages/voyagesApi';
import { notify } from '../../utils/notify';
import { Can } from '../../components/shared/Can';

interface VoyageDetailDialogProps {
  open: boolean;
  voyageId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<VoyageStatut, { label: string; color: 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  PLANIFIE: { label: 'Planifié', color: 'info' },
  EN_COURS: { label: 'En cours', color: 'warning' },
  LIVRE: { label: 'Livré', color: 'success' },
  ANNULE: { label: 'Annulé', color: 'error' },
  FACTURE: { label: 'Facturé', color: 'secondary' },
};

export function VoyageDetailDialog({ open, voyageId, onClose }: VoyageDetailDialogProps) {
  const { data: voyage, isLoading, isError } = useVoyageQuery(voyageId);
  const { data: documents = [] } = useVoyageDocumentsQuery(voyageId);
  const { data: frais } = useVoyageFraisQuery(voyageId);

  const uploadDocsMutation = useUploadVoyageDocuments();
  const deleteDocMutation = useDeleteVoyageDocument();

  const statusCfg = voyage ? STATUT_CONFIG[voyage.statut] || { label: voyage.statut, color: 'default' as any } : null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !voyageId) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    try {
      await uploadDocsMutation.mutateAsync({ idVoyage: voyageId, files });
    } catch (_) {}
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!voyageId) return;
    try {
      await deleteDocMutation.mutateAsync({ docId, idVoyage: voyageId });
    } catch (_) {}
  };

  const handleDownloadDoc = async (doc: DocumentVoyage) => {
    if (!voyageId) return;
    try {
      await voyagesApi.downloadDocumentFile(voyageId, doc.id, doc.nomOriginal);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    }
  };

  const handleViewDoc = async (docId: number) => {
    if (!voyageId) return;
    try {
      const blobUrl = await voyagesApi.viewDocumentFile(voyageId, docId);
      window.open(blobUrl, '_blank');
    } catch (_) {
      notify.error('Erreur lors de l\'ouverture du document');
    }
  };

  const montantBase = Number(voyage?.montantVoyage || 0);
  const montantFrais = Number(frais?.montantTotal || voyage?.fraisImmobilisation?.montantTotal || 0);
  const sousTotal = montantBase + montantFrais;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <RouteIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Fiche Voyage #{voyage?.idVoyage || ''}
            </Typography>
            {voyage && (
              <Typography variant="caption" color="text.secondary">
                Type : {voyage.typeVoyage} {voyage.numeroCmr ? `• CMR: ${voyage.numeroCmr}` : ''}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Chargement des détails du voyage...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger les détails du voyage.
          </Typography>
        )}

        {voyage && statusCfg && (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Statut opérationnel
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Mode de facturation
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={voyage.modeFacturation === 'SANS_FACTURE' ? 'Sans facture' : 'Avec facture'}
                    color={voyage.modeFacturation === 'SANS_FACTURE' ? 'warning' : 'primary'}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Montant du voyage HT
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  <AttachMoneyIcon fontSize="small" color="action" />
                  <Typography variant="body1" fontWeight={700} color="primary.main">
                    {voyage.montantVoyage.toLocaleString('fr-FR')} {voyage.devise || 'MAD'}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Itinéraire de transport
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                  {voyage.lieuChargement} ➔ {voyage.lieuDechargement}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Client partenaire
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight={600}>{voyage.nomClient || 'Non attribué'}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Conducteur principal
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2">{voyage.nomConducteur || 'Non attribué'}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Tracteur
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <LocalShippingIcon fontSize="small" color="action" />
                  <Typography variant="body2">{voyage.tracteur || 'Non attribué'}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Remorque
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{voyage.remorque || 'Aucune'}</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Date de chargement
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="body2">{voyage.dateChargement || 'Non planifiée'}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Numéro CMR
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <ReceiptLongIcon fontSize="small" color="action" />
                  <Typography variant="body2">{voyage.numeroCmr || '—'}</Typography>
                </Stack>
              </Grid>
            </Grid>

            {/* Section Frais d'immobilisation */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'warning.light' }}>
              <Typography variant="subtitle2" fontWeight={700} color="warning.main" gutterBottom>
                Frais d'immobilisation
              </Typography>
              {frais || voyage.fraisImmobilisation ? (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Prix / jour</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {Number((frais || voyage.fraisImmobilisation)?.prixParJour).toLocaleString('fr-FR')} {voyage.devise}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Jours de retard</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {(frais || voyage.fraisImmobilisation)?.nombreJoursRetard} jour(s)
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Montant total frais</Typography>
                    <Typography variant="body2" fontWeight={700} color="warning.main">
                      {montantFrais.toLocaleString('fr-FR')} {voyage.devise}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Montant du voyage HT ({montantBase.toLocaleString('fr-FR')}) + Frais d'immobilisation HT ({montantFrais.toLocaleString('fr-FR')})
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                        Sous-total HT = {sousTotal.toLocaleString('fr-FR')} {voyage.devise}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun frais d'immobilisation enregistré pour ce voyage.
                </Typography>
              )}
            </Paper>

            {/* Section Documents de voyage */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Documents de voyage ({documents.length})
                </Typography>

                <Can module="voyages" action="modifier">
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={uploadDocsMutation.isPending ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                    disabled={uploadDocsMutation.isPending}
                  >
                    Ajouter un document
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".pdf,.jpeg,.jpg,.png,.webp"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Can>
              </Stack>

              {documents.length > 0 ? (
                <Stack spacing={1}>
                  {documents.map((doc) => (
                    <Stack
                      key={doc.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <AttachFileIcon color="primary" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {doc.nomOriginal}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.mimeType} • {(Number(doc.tailleFichier) / 1024).toFixed(0)} Ko • Ajouté le{' '}
                            {new Date(doc.creeLe).toLocaleDateString('fr-FR')}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" title="Visualiser" onClick={() => handleViewDoc(doc.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Télécharger" onClick={() => handleDownloadDoc(doc)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        <Can module="voyages" action="modifier">
                          <IconButton
                            size="small"
                            color="error"
                            title="Supprimer"
                            onClick={() => handleDeleteDoc(doc.id)}
                            disabled={deleteDocMutation.isPending}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Can>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun document joint à ce voyage.
                </Typography>
              )}
            </Paper>
          </Stack>
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

