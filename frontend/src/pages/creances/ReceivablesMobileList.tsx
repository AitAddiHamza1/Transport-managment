import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentsIcon from '@mui/icons-material/Payments';
import type { CreanceClient } from '../../features/creances/types';
import { Can } from '../../components/shared/Can';

interface ReceivablesMobileListProps {
  creances: CreanceClient[];
  onView: (creance: CreanceClient) => void;
  onPay: (creance: CreanceClient) => void;
}

const STATUT_CONFIG: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'success' | 'default' }
> = {
  NON_PAYE: { label: 'Non payé', color: 'error' },
  PARTIEL: { label: 'Partiel', color: 'warning' },
  PAYE: { label: 'Payé', color: 'success' },
  EN_RETARD: { label: 'En retard', color: 'error' },
};

export function ReceivablesMobileList({ creances, onView, onPay }: ReceivablesMobileListProps) {
  if (creances.length === 0) return null;

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {creances.map((c) => {
        const cfg = STATUT_CONFIG[c.statutPaiement] || { label: c.statutPaiement, color: 'default' };
        const isPaid = c.statutPaiement === 'PAYE' || c.solde <= 0;

        return (
          <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {c.numeroFacture}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.nomClient}
                  </Typography>
                </Box>
                <Chip label={cfg.label} color={cfg.color} size="small" />
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Montant Facture
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {c.montantFacture.toLocaleString()} MAD
                  </Typography>
                </Box>
                <Box text-align="right">
                  <Typography variant="caption" color="text.secondary">
                    Solde restant
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color={isPaid ? 'success.main' : 'error.main'}>
                    {c.solde.toLocaleString()} MAD
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Tooltip title="Consulter le détail">
                  <IconButton size="small" color="info" onClick={() => onView(c)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {!isPaid && (
                  <Can module="paiements_clients" action="ajouter">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PaymentsIcon />}
                      onClick={() => onPay(c)}
                    >
                      Régler
                    </Button>
                  </Can>
                )}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
