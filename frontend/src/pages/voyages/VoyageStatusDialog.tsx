import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { Voyage, VoyageStatut } from '../../features/voyages/types';

interface VoyageStatusDialogProps {
  open: boolean;
  voyage: Voyage | null;
  onClose: () => void;
  onSubmit: (newStatus: VoyageStatut) => Promise<void>;
  isLoading: boolean;
}

export function VoyageStatusDialog({
  open,
  voyage,
  onClose,
  onSubmit,
  isLoading,
}: VoyageStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<VoyageStatut>('PLANIFIE');

  useEffect(() => {
    if (voyage) {
      setSelectedStatus(voyage.statut);
    }
  }, [voyage, open]);

  const handleSubmit = async () => {
    await onSubmit(selectedStatus);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Changer le statut du voyage</DialogTitle>
      <DialogContent dividers>
        {voyage && (
          <Stack spacing={2}>
            <Typography variant="body2">
              Voyage : <strong>#{voyage.idVoyage}</strong> ({voyage.lieuChargement} ➔ {voyage.lieuDechargement})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Statut actuel : <strong>{voyage.statut}</strong>
            </Typography>

            <TextField
              select
              label="Nouveau statut *"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as VoyageStatut)}
              fullWidth
              disabled={isLoading}
            >
              <MenuItem value="PLANIFIE">Planifié</MenuItem>
              <MenuItem value="EN_COURS">En cours</MenuItem>
              <MenuItem value="LIVRE">Livré</MenuItem>
              <MenuItem value="ANNULE">Annulé</MenuItem>
              <MenuItem value="FACTURE">Facturé</MenuItem>
            </TextField>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="warning"
          disabled={isLoading || (voyage ? voyage.statut === selectedStatus : false)}
          startIcon={isLoading ? <CircularProgress size={18} /> : null}
        >
          Mettre à jour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
