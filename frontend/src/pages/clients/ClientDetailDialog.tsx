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
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useClientQuery } from '../../features/clients/useClients';
import { ClientStatut } from '../../features/clients/types';

interface ClientDetailDialogProps {
  open: boolean;
  clientId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<ClientStatut, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIF: { label: 'Actif', color: 'success' },
  INACTIF: { label: 'Inactif', color: 'warning' },
  BLOQUE: { label: 'Bloqué', color: 'error' },
};

export function ClientDetailDialog({ open, clientId, onClose }: ClientDetailDialogProps) {
  const { data: client, isLoading, isError } = useClientQuery(clientId);

  const statusCfg = client ? STATUT_CONFIG[client.statut] || { label: client.statut, color: 'default' as any } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <BusinessIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {client?.nomEntreprise || 'Fiche Client'}
            </Typography>
            {client && (
              <Typography variant="caption" color="text.secondary">
                Identifiant Client #{client.id} {client.ice ? `• ICE: ${client.ice}` : ''}
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
              Chargement de la fiche client...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger la fiche client.
          </Typography>
        )}

        {client && statusCfg && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Statut actuel
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                ICE (15 chiffres)
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                {client.ice || 'Non renseigné'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Téléphone
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="body2">{client.telephone || 'Non renseigné'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2">{client.email || 'Non renseigné'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Adresse postale
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
                <HomeIcon fontSize="small" color="action" />
                <Typography variant="body2">{client.adresse || 'Non renseignée'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Délai de paiement
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>
                  {client.delaiPaiementJours} jour(s)
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Plafond de crédit
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <CreditCardIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  {client.limiteCredit.toLocaleString()} MAD
                </Typography>
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
