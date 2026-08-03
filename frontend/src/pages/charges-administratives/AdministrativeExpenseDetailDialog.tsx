import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import {
  CATEGORY_LABELS,
  ChargeAdministrative,
} from '../../features/charges-administratives/types';
import { usePermission } from '../../features/auth/usePermission';

interface AdministrativeExpenseDetailDialogProps {
  open: boolean;
  expense: ChargeAdministrative | null;
  onClose: () => void;
  onEdit: (expense: ChargeAdministrative) => void;
  onDelete: (expense: ChargeAdministrative) => void;
  onUploadReceipt: (id: number, file: File) => Promise<void>;
  onDeleteReceipt: (id: number) => Promise<void>;
  isUploadingReceipt: boolean;
  isDeletingReceipt: boolean;
}

export function AdministrativeExpenseDetailDialog({
  open,
  expense,
  onClose,
  onEdit,
  onDelete,
  onUploadReceipt,
  onDeleteReceipt,
  isUploadingReceipt,
  isDeletingReceipt,
}: AdministrativeExpenseDetailDialogProps) {
  const { can } = usePermission();
  const canModify = can('depenses_administratives', 'modifier');
  const canDelete = can('depenses_administratives', 'supprimer');

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!expense) return null;

  const numMontant = parseFloat(expense.montant);
  const formattedMontant = !isNaN(numMontant)
    ? numMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : expense.montant;

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMessage(null);
      setErrorMessage(null);
      try {
        await onUploadReceipt(expense.idDepense, file);
        setMessage('Justificatif téléversé avec succès.');
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || 'Erreur lors du téléversement du justificatif.',
        );
      }
    }
  };

  const handleReceiptDelete = async () => {
    setMessage(null);
    setErrorMessage(null);
    try {
      await onDeleteReceipt(expense.idDepense);
      setMessage('Justificatif supprimé avec succès.');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Erreur lors de la suppression du justificatif.',
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Charge administrative #{expense.idDepense}
          </Typography>
          <Chip
            label={CATEGORY_LABELS[expense.categorieDepense as keyof typeof CATEGORY_LABELS] || expense.categorieDepense}
            color="primary"
            variant="outlined"
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Main Info Box */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', backgroundColor: '#f8fafc' }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                Informations financières & date
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Montant TTC :
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formattedMontant} MAD
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Date de dépense :
                  </Typography>

                  <Typography variant="body2" fontWeight="bold">
                    {new Date(expense.dateDepense).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>

                {expense.auteur && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Enregistré par :
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {expense.auteur.nom}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Description & Metadata Box */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', backgroundColor: '#f8fafc' }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                Description & remarques
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {expense.description || 'Aucune description renseignée'}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary" display="block">
                Date de création système : {new Date(expense.creeLe).toLocaleString('fr-FR')}
              </Typography>
            </Paper>
          </Grid>

          {/* Receipt File Section */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Justificatif / Reçu joint
              </Typography>

              {expense.hasReceipt && expense.receiptUrl ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<VisibilityIcon />}
                    component="a"
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Consulter le justificatif (Aperçu)
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    component="a"
                    href={expense.receiptDownloadUrl || expense.receiptUrl}
                    download
                  >
                    Télécharger le justificatif
                  </Button>

                  {canModify && (
                    <>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                        disabled={isUploadingReceipt}
                      >
                        Remplacer
                        <input
                          type="file"
                          hidden
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={handleReceiptUpload}
                        />
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleReceiptDelete}
                        disabled={isDeletingReceipt}
                      >
                        Supprimer le reçu
                      </Button>
                    </>
                  )}
                </Stack>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Aucun reçu ou justificatif n'est actuellement rattaché à cette charge.
                  </Typography>

                  {canModify && (
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<UploadFileIcon />}
                      disabled={isUploadingReceipt}
                    >
                      Joindre un justificatif (PDF, JPG, PNG)
                      <input
                        type="file"
                        hidden
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={handleReceiptUpload}
                      />
                    </Button>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Fermer</Button>

        {canModify && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              onClose();
              onEdit(expense);
            }}
          >
            Modifier
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              onClose();
              onDelete(expense);
            }}
          >
            Supprimer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
