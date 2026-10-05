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
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import type { PaiementClient } from '../../features/paiements-clients/types';
import { formatDisplayDate } from '../../utils/formatDate';
import { Can } from '../../components/shared/Can';

interface CustomerPaymentsMobileListProps {
  paiements: PaiementClient[];
  onView: (paiement: PaiementClient) => void;
  onEdit: (paiement: PaiementClient) => void;
  onCancel: (paiement: PaiementClient) => void;
}

export function CustomerPaymentsMobileList({
  paiements,
  onView,
  onEdit,
  onCancel,
}: CustomerPaymentsMobileListProps) {
  if (paiements.length === 0) return null;

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {paiements.map((p) => {
        const isCancelled = Boolean(p.estAnnule);

        return (
          <Paper
            key={p.id}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              opacity: isCancelled ? 0.75 : 1,
              borderColor: isCancelled ? 'error.light' : 'divider',
              bgcolor: isCancelled ? 'action.hover' : 'background.paper',
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
                  >
                    REG-{p.id.toString().padStart(4, '0')} — {p.numeroFacture}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.nomClient}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {isCancelled ? (
                    <Chip label="Annulé" color="error" size="small" variant="filled" />
                  ) : (
                    <Chip label={p.methodePaiement} color="primary" variant="outlined" size="small" />
                  )}
                </Stack>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date règlement
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDisplayDate(p.datePaiement)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Montant encaissé
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={isCancelled ? 'text.secondary' : 'success.main'}
                    sx={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
                  >
                    {p.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                    {p.devise || 'MAD'}
                  </Typography>
                  {p.devise === 'EUR' && p.montantConvertiMad && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      ≈ {p.montantConvertiMad.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                      MAD
                    </Typography>
                  )}
                </Box>
              </Stack>

              <Stack
                direction="row"
                justifyContent="flex-end"
                alignItems="center"
                spacing={0.5}
                sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
              >
                <Tooltip title="Consulter">
                  <IconButton size="small" color="info" onClick={() => onView(p)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {!isCancelled && (
                  <>
                    <Can module="paiements_clients" action="modifier">
                      <Tooltip title="Modifier">
                        <IconButton size="small" color="primary" onClick={() => onEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>

                    <Can module="paiements_clients" action="supprimer">
                      <Tooltip title="Annuler le règlement">
                        <IconButton size="small" color="error" onClick={() => onCancel(p)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Can>
                  </>
                )}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
