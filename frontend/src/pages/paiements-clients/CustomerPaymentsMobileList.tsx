import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { PaiementClient } from '../../features/paiements-clients/types';

interface CustomerPaymentsMobileListProps {
  paiements: PaiementClient[];
  onView: (paiement: PaiementClient) => void;
}

export function CustomerPaymentsMobileList({
  paiements,
  onView,
}: CustomerPaymentsMobileListProps) {
  if (paiements.length === 0) return null;

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {paiements.map((p) => (
        <Paper key={p.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  REG-{p.id.toString().padStart(4, '0')} — {p.numeroFacture}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.nomClient}
                </Typography>
              </Box>
              <Chip label={p.methodePaiement} color="primary" variant="outlined" size="small" />
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Date règlement
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {p.datePaiement}
                </Typography>
              </Box>
              <Box text-align="right">
                <Typography variant="caption" color="text.secondary">
                  Montant encaissé
                </Typography>
                <Typography variant="body2" fontWeight={700} color="success.main">
                  {p.montantRecu.toLocaleString()} MAD
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              justifyContent="flex-end"
              alignItems="center"
              sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
            >
              <Tooltip title="Consulter le règlement">
                <IconButton size="small" color="info" onClick={() => onView(p)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
