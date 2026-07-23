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
import StorefrontIcon from '@mui/icons-material/Storefront';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import { useFournisseurQuery } from '../../features/fournisseurs/useFournisseurs';
import { FournisseurStatut } from '../../features/fournisseurs/types';

interface FournisseurDetailDialogProps {
  open: boolean;
  supplierId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<FournisseurStatut, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIF: { label: 'Actif', color: 'success' },
  INACTIF: { label: 'Inactif', color: 'warning' },
  BLOQUE: { label: 'Bloqué', color: 'error' },
};

export function FournisseurDetailDialog({ open, supplierId, onClose }: FournisseurDetailDialogProps) {
  const { data: supplier, isLoading, isError } = useFournisseurQuery(supplierId);

  const statusCfg = supplier ? STATUT_CONFIG[supplier.statut] || { label: supplier.statut, color: 'default' as any } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <StorefrontIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {supplier?.nomFournisseur || 'Fiche Fournisseur'}
            </Typography>
            {supplier && (
              <Typography variant="caption" color="text.secondary">
                Identifiant Fournisseur #{supplier.id} {supplier.ice ? `• ICE: ${supplier.ice}` : ''}
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
              Chargement de la fiche fournisseur...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger la fiche fournisseur.
          </Typography>
        )}

        {supplier && statusCfg && (
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
                {supplier.ice || 'Non renseigné'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Téléphone
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="body2">{supplier.telephone || 'Non renseigné'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2">{supplier.email || 'Non renseigné'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Adresse postale
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
                <HomeIcon fontSize="small" color="action" />
                <Typography variant="body2">{supplier.adresse || 'Non renseignée'}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Date de création
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {new Date(supplier.creeLe).toLocaleDateString()}
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
