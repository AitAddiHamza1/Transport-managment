import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useCreatePaiementFournisseur } from '../../features/paiements-fournisseurs/usePaiementsFournisseurs';
import type { DetteFournisseurView } from '../../features/dettes-fournisseurs/types';
import { notify } from '../../utils/notify';

interface AddSupplierPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  dette: DetteFournisseurView;
}

export const AddSupplierPaymentDialog: React.FC<AddSupplierPaymentDialogProps> = ({
  open,
  onClose,
  dette,
}) => {
  const createPaymentMutation = useCreatePaiementFournisseur();

  const [montant, setMontant] = useState<number | ''>(dette.soldeRestant);
  const [modePaiement, setModePaiement] = useState('VIREMENT');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().substring(0, 10));
  const [referenceExterne, setReferenceExterne] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!montant || Number(montant) <= 0) {
      notify.error('Le montant du versement doit être supérieur à 0');
      return;
    }

    if (Number(montant) > dette.soldeRestant) {
      notify.error(
        `Le montant (${montant} MAD) dépasse le solde restant de la dette (${dette.soldeRestant} MAD)`,
      );
      return;
    }

    createPaymentMutation.mutate(
      {
        idDetteFournisseur: dette.id,
        payload: {
          montant: Number(montant),
          modePaiement,
          datePaiement: datePaiement || undefined,
          referenceExterne: referenceExterne.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          notify.success(`Versement de ${montant} MAD enregistré avec succès`);
          onClose();
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || 'Erreur lors du versement';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Ajouter un versement pour la dette #{dette.numeroDette}</DialogTitle>
        <DialogContent dividers>
          <Box mb={2} p={2} bgcolor="action.hover" borderRadius={2}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Fournisseur
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {dette.nomFournisseurSnapshot}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Solde Restant
                </Typography>
                <Typography variant="body2" fontWeight={700} color="error.main">
                  {dette.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Montant du versement"
                value={montant}
                onChange={(e) => setMontant(e.target.value === '' ? '' : Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">MAD</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                required
                label="Mode de paiement"
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
              >
                <MenuItem value="VIREMENT">VIREMENT</MenuItem>
                <MenuItem value="CHEQUE">CHÈQUE</MenuItem>
                <MenuItem value="ESPECES">ESPÈCES</MenuItem>
                <MenuItem value="CARTE">CARTE BANCAIRE</MenuItem>
                <MenuItem value="EFFET">EFFET DE COMMERCE</MenuItem>
                <MenuItem value="PRELEVEMENT">PRÉLÈVEMENT</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de versement"
                InputLabelProps={{ shrink: true }}
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Réf. externe / N° Chèque"
                value={referenceExterne}
                onChange={(e) => setReferenceExterne(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={createPaymentMutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={createPaymentMutation.isPending}
          >
            {createPaymentMutation.isPending ? 'Enregistrement...' : 'Valider le versement'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
