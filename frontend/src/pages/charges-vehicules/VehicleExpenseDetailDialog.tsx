import { useState } from 'react';
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
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { chargesVehiculesApi } from '../../features/charges-vehicules/chargesVehiculesApi';
import { useChargeVehiculeQuery } from '../../features/charges-vehicules/useChargesVehicules';
import { notify } from '../../utils/notify';

interface VehicleExpenseDetailDialogProps {
  open: boolean;
  expenseId: number | null;
  onClose: () => void;
}

export function VehicleExpenseDetailDialog({ open, expenseId, onClose }: VehicleExpenseDetailDialogProps) {
  const { data: expense, isLoading, isError } = useChargeVehiculeQuery(expenseId);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePreview = async () => {
    if (!expense) return;
    const previewWindow = window.open('', '_blank');
    setIsPreviewing(true);
    try {
      const blobUrl = await chargesVehiculesApi.previewReceiptFile(expense.idDepense);
      if (previewWindow) {
        previewWindow.location.href = blobUrl;
      } else {
        notify.error("Le navigateur a bloqué l'ouverture de la fenêtre d'aperçu");
      }
    } catch (_) {
      previewWindow?.close();
      notify.error("Erreur lors de l'ouverture du justificatif");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    if (!expense) return;
    setIsDownloading(true);
    try {
      await chargesVehiculesApi.downloadReceiptFile(expense.idDepense);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du justificatif');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <BuildIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Fiche Dépense Véhicule #{expense?.idDepense || ''}
            </Typography>
            {expense && (
              <Typography variant="caption" color="text.secondary">
                Catégorie : {expense.categorieDepense}
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
              Chargement des détails de la dépense...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger les détails de la dépense.
          </Typography>
        )}

        {expense && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Montant total
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <AttachMoneyIcon fontSize="small" color="action" />
                <Typography variant="body1" fontWeight={700} color="primary.main">
                  {expense.montant.toLocaleString('fr-FR')} MAD
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Catégorie
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={expense.categorieDepense} color="primary" size="small" variant="outlined" />
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Véhicule concerné
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <LocalShippingIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={700}>
                  {expense.immatriculation}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Date de la dépense
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2">{expense.dateDepense}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Justificatif de dépense
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={expense.justificatifType === 'AVEC_FACTURE' ? 'Avec facture' : 'Sans facture'}
                  color={expense.justificatifType === 'AVEC_FACTURE' ? 'primary' : 'default'}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Grid>

            {expense.justificatifType === 'AVEC_FACTURE' ? (
              <>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    N° Facture / Référence
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <ReceiptLongIcon fontSize="small" color="action" />
                    <Typography variant="body2">{expense.typeFacture || '—'}</Typography>
                  </Stack>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Facture / Reçu joint
                  </Typography>
                  {expense.hasReceipt ? (
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={isPreviewing ? <CircularProgress size={16} /> : <VisibilityIcon />}
                        onClick={handlePreview}
                        disabled={isPreviewing || isDownloading}
                      >
                        Consulter
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={isDownloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                        onClick={handleDownload}
                        disabled={isPreviewing || isDownloading}
                      >
                        Télécharger
                      </Button>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Aucun reçu joint
                    </Typography>
                  )}
                </Grid>
              </>
            ) : null}

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
                <DescriptionIcon fontSize="small" color="action" />
                <Typography variant="body2">{expense.description || 'Aucune description'}</Typography>
              </Stack>
            </Grid>
          </Grid>
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
