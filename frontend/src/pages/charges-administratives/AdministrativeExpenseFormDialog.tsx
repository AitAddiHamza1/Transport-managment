import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  ADMINISTRATIVE_EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  ChargeAdministrative,
  CreateChargeAdministrativePayload,
} from '../../features/charges-administratives/types';

interface AdministrativeExpenseFormDialogProps {
  open: boolean;
  expense: ChargeAdministrative | null;
  onClose: () => void;
  onSubmit: (payload: CreateChargeAdministrativePayload) => Promise<void>;
  isLoading: boolean;
}

export function AdministrativeExpenseFormDialog({
  open,
  expense,
  onClose,
  onSubmit,
  isLoading,
}: AdministrativeExpenseFormDialogProps) {
  const isEdit = Boolean(expense);

  const [categorieDepense, setCategorieDepense] = useState<string>('LOYER');
  const [description, setDescription] = useState<string>('');
  const [montant, setMontant] = useState<string>('');
  const [dateDepense, setDateDepense] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recuFile, setRecuFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (expense && open) {
      setCategorieDepense(expense.categorieDepense);
      setDescription(expense.description || '');
      setMontant(expense.montant || '');
      setDateDepense(expense.dateDepense);
      setRecuFile(null);
    } else if (open) {
      setCategorieDepense('LOYER');
      setDescription('');
      setMontant('');
      setDateDepense(new Date().toISOString().split('T')[0]);
      setRecuFile(null);
    }
    setErrors({});
    setErrorMessage(null);
  }, [expense, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage(null);

    const newErrors: Record<string, string> = {};

    if (!categorieDepense) {
      newErrors.categorieDepense = 'La catégorie est obligatoire';
    }

    const numMontant = parseFloat(montant);
    if (isNaN(numMontant) || numMontant <= 0) {
      newErrors.montant = 'Le montant doit être un nombre strictement supérieur à 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        categorieDepense,
        description: description.trim() || undefined,
        montant: numMontant,
        dateDepense: dateDepense || undefined,
        recu: recuFile,
      });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          'Une erreur est survenue lors de l’enregistrement de la charge administrative.',
      );
    }
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight="bold">
        {isEdit
          ? `Modifier la charge administrative #${expense?.idDepense}`
          : 'Nouvelle charge administrative'}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Category Field */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Catégorie de charge *"
                value={categorieDepense}
                onChange={(e) => setCategorieDepense(e.target.value)}
                error={Boolean(errors.categorieDepense)}
                helperText={errors.categorieDepense}
                disabled={isLoading}
                required
              >
                {ADMINISTRATIVE_EXPENSE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]} ({cat})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Montant Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                fullWidth
                label="Montant (MAD) *"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                error={Boolean(errors.montant)}
                helperText={errors.montant || 'Montant TTC strictly > 0'}
                disabled={isLoading}
                inputProps={{ min: 0.01, step: 0.01 }}
                required
              />
            </Grid>

            {/* Date Depense Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                fullWidth
                label="Date de dépense *"
                value={dateDepense}
                onChange={(e) => setDateDepense(e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={isLoading}
                required
              />
            </Grid>

            {/* Description Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description / Motif"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                disabled={isLoading}
                placeholder="Ex: Facture Maroc Telecom Mai 2026, Loyer bureau, etc."
                inputProps={{ maxLength: 255 }}
              />
            </Grid>

            {/* Optional Receipt Attachment during Create */}
            {!isEdit && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    border: '1px dashed #cbd5e1',
                    borderRadius: 2,
                    backgroundColor: '#f8fafc',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Reçu / Justificatif (Optionnel)
                  </Typography>

                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    disabled={isLoading}
                    sx={{ mt: 1 }}
                  >
                    {recuFile ? recuFile.name : 'Joindre un justificatif (PDF, JPG, PNG)'}
                    <input
                      type="file"
                      hidden
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setRecuFile(e.target.files[0]);
                        }
                      }}
                    />
                  </Button>
                  {recuFile && (
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Taille : {(recuFile.size / 1024).toFixed(1)} Ko
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} /> : null}
          >
            {isEdit ? 'Enregistrer' : 'Créer la charge'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
