import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useCancelPaiementFournisseur } from '../../features/paiements-fournisseurs/usePaiementsFournisseurs';
import type { DetteFournisseurView } from '../../features/dettes-fournisseurs/types';
import { notify } from '../../utils/notify';

interface CancelSupplierPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  dette: DetteFournisseurView;
  versementId: number;
}

export const CancelSupplierPaymentDialog: React.FC<CancelSupplierPaymentDialogProps> = ({
  open,
  onClose,
  dette,
  versementId,
}) => {
  const cancelPaymentMutation = useCancelPaiementFournisseur();
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!motifAnnulation.trim()) {
      notify.error('Veuillez spécifier le motif d annulation');
      return;
    }

    cancelPaymentMutation.mutate(
      {
        idDetteFournisseur: dette.id,
        versementId,
        payload: {
          motifAnnulation: motifAnnulation.trim(),
        },
      },
      {
        onSuccess: () => {
          notify.success('Versement annulé avec succès');
          onClose();
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || 'Erreur lors de l annulation';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Annuler le versement</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            L annulation d un versement réajustera automatiquement le solde restant de la dette #{dette.numeroDette}.
          </Alert>

          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Motif d annulation"
            placeholder="Précisez la raison de l annulation..."
            value={motifAnnulation}
            onChange={(e) => setMotifAnnulation(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={cancelPaymentMutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={cancelPaymentMutation.isPending}
          >
            {cancelPaymentMutation.isPending ? 'Annulation en cours...' : 'Confirmer l annulation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
