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
import { Client, ClientStatut } from '../../features/clients/types';

interface ClientStatusDialogProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSubmit: (newStatus: ClientStatut) => Promise<void>;
  isLoading: boolean;
}

export function ClientStatusDialog({
  open,
  client,
  onClose,
  onSubmit,
  isLoading,
}: ClientStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<ClientStatut>('ACTIF');

  useEffect(() => {
    if (client) {
      setSelectedStatus(client.statut);
    }
  }, [client, open]);

  const handleSubmit = async () => {
    await onSubmit(selectedStatus);
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Changer le statut du client</DialogTitle>
      <DialogContent dividers>
        {client && (
          <Stack spacing={2}>
            <Typography variant="body2">
              Client : <strong>{client.nomEntreprise}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Statut actuel : <strong>{client.statut}</strong>
            </Typography>

            <TextField
              select
              label="Nouveau statut *"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ClientStatut)}
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
          disabled={isLoading || (client ? client.statut === selectedStatus : false)}
          startIcon={isLoading ? <CircularProgress size={18} /> : null}
        >
          Mettre à jour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
