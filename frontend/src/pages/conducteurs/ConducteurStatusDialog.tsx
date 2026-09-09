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
import { Conducteur, ConducteurStatut } from '../../features/conducteurs/types';

interface ConducteurStatusDialogProps {
  open: boolean;
  driver: Conducteur | null;
  onClose: () => void;
  onSubmit: (newStatus: ConducteurStatut) => Promise<void>;
  isLoading: boolean;
}

export function ConducteurStatusDialog({
  open,
  driver,
  onClose,
  onSubmit,
  isLoading,
}: ConducteurStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<ConducteurStatut>('DISPONIBLE');

  useEffect(() => {
    if (driver) {
      // If driver is currently EN_VOYAGE, default selection to DISPONIBLE for potential release/update
      setSelectedStatus(driver.statut === 'EN_VOYAGE' ? 'DISPONIBLE' : driver.statut);
    }
  }, [driver, open]);

  const handleSubmit = async () => {
    await onSubmit(selectedStatus);
  };

  const isCurrentEnVoyage = driver?.statut === 'EN_VOYAGE';

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Changer le statut du conducteur</DialogTitle>
      <DialogContent dividers>
        {driver && (
          <Stack spacing={2}>
            <Typography variant="body2">
              Conducteur : <strong>{driver.nomConducteur}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Statut actuel : <strong>{driver.statut}</strong>
            </Typography>

            <TextField
              select
              label="Nouveau statut *"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ConducteurStatut)}
              fullWidth
              disabled={isLoading}
              helperText={
                isCurrentEnVoyage
                  ? 'Le statut EN_VOYAGE est géré automatiquement par les voyages.'
                  : undefined
              }
            >
              <MenuItem value="DISPONIBLE">Disponible</MenuItem>
              <MenuItem value="EN_VOYAGE" disabled>
                En voyage (géré automatiquement)
              </MenuItem>
              <MenuItem value="INDISPONIBLE">Indisponible</MenuItem>
              <MenuItem value="INACTIF">Inactif</MenuItem>
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
          disabled={isLoading || (driver ? driver.statut === selectedStatus : false)}
          startIcon={isLoading ? <CircularProgress size={18} /> : null}
        >
          Mettre à jour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
