import {
  Alert,
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
import { Vehicule, VehiculeStatut } from '../../features/vehicles/types';

interface VehicleStatusDialogProps {
  open: boolean;
  vehicle: Vehicule | null;
  onClose: () => void;
  onSubmit: (status: VehiculeStatut) => Promise<void>;
  isLoading: boolean;
}

export function VehicleStatusDialog({
  open,
  vehicle,
  onClose,
  onSubmit,
  isLoading,
}: VehicleStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<VehiculeStatut>('DISPONIBLE');

  useEffect(() => {
    if (vehicle) {
      setSelectedStatus(vehicle.statut);
    }
  }, [vehicle, open]);

  const handleSubmit = async () => {
    await onSubmit(selectedStatus);
  };

  const isCurrentEnVoyage = vehicle?.statut === 'EN_VOYAGE';
  const isEmergencyBreakdown = isCurrentEnVoyage && (selectedStatus === 'MAINTENANCE' || selectedStatus === 'HORS_SERVICE');

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Statut opérationnel — {vehicle?.immatriculation}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Sélectionnez le nouveau statut opérationnel pour le véhicule :
          </Typography>

          <TextField
            select
            label="Statut opérationnel"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as VehiculeStatut)}
            fullWidth
            disabled={isLoading}
          >
            <MenuItem value="DISPONIBLE">Disponible</MenuItem>
            <MenuItem value="EN_VOYAGE">En voyage</MenuItem>
            <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            <MenuItem value="HORS_SERVICE">Hors service</MenuItem>
          </TextField>

          {isEmergencyBreakdown && (
            <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
              Ce véhicule a un voyage en cours. Son statut passera en {selectedStatus}, mais le voyage restera EN_COURS jusqu’à sa clôture dans le module Voyages.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || selectedStatus === vehicle?.statut}
          startIcon={isLoading ? <CircularProgress size={18} /> : null}
        >
          Mettre à jour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
