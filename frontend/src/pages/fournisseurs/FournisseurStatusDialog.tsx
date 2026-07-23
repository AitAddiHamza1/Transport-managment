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
import { Fournisseur, FournisseurStatut } from '../../features/fournisseurs/types';

interface FournisseurStatusDialogProps {
  open: boolean;
  supplier: Fournisseur | null;
  onClose: () => void;
  onSubmit: (newStatus: FournisseurStatut) => Promise<void>;
  isLoading: boolean;
}

export function FournisseurStatusDialog({
  open,
  supplier,
  onClose,
  onSubmit,
  isLoading,
}: FournisseurStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<FournisseurStatut>('ACTIF');

  useEffect(() => {
    if (supplier) {
      setSelectedStatus(supplier.statut);
    }
  }, [supplier, open]);

  const handleSubmit = async () => {
    await onSubmit(selectedStatus);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Changer le statut du fournisseur</DialogTitle>
      <DialogContent dividers>
        {supplier && (
          <Stack spacing={2}>
            <Typography variant="body2">
              Fournisseur : <strong>{supplier.nomFournisseur}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Statut actuel : <strong>{supplier.statut}</strong>
            </Typography>

            <TextField
              select
              label="Nouveau statut *"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as FournisseurStatut)}
              fullWidth
              disabled={isLoading}
            >
              <MenuItem value="ACTIF">Actif</MenuItem>
              <MenuItem value="INACTIF">Inactif</MenuItem>
              <MenuItem value="BLOQUE">Bloqué</MenuItem>
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
          disabled={isLoading || (supplier ? supplier.statut === selectedStatus : false)}
          startIcon={isLoading ? <CircularProgress size={18} /> : null}
        >
          Mettre à jour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
