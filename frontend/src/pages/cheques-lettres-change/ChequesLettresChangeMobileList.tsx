import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import {
  PaymentInstrumentView,
  STATUT_BANCAIRE_COLORS,
  STATUT_BANCAIRE_LABELS,
} from '../../features/cheques-lettres-change/types';

interface ChequesLettresChangeMobileListProps {
  instruments: PaymentInstrumentView[];
  onViewDetail: (instrument: PaymentInstrumentView) => void;
  onDownloadDoc?: (instrument: PaymentInstrumentView) => void;
}

export function ChequesLettresChangeMobileList({
  instruments,
  onViewDetail,
  onDownloadDoc,
}: ChequesLettresChangeMobileListProps) {
  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}>
      {instruments.map((inst) => {
        const isCheque = inst.instrumentType === 'CHEQUE';
        const formattedAmount = !isNaN(inst.montant)
          ? inst.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '0,00';

        return (
          <Card key={`${inst.instrumentType}-${inst.id}`} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {isCheque ? 'Chèque' : 'Lettre'} #{inst.numero}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {inst.date ? new Date(inst.date).toLocaleDateString('fr-FR') : ''} | Réf: {inst.paymentReference}
                  </Typography>
                </Box>
                <Chip
                  label={STATUT_BANCAIRE_LABELS[inst.statutBancaire] || inst.statutBancaire}
                  color={STATUT_BANCAIRE_COLORS[inst.statutBancaire]}
                  size="small"
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                  label={inst.source === 'CLIENT' ? 'Client (IN)' : 'Fournisseur (OUT)'}
                  color={inst.direction === 'IN' ? 'success' : 'warning'}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={inst.partyName}
                  size="small"
                  variant="outlined"
                />
              </Stack>

              {isCheque ? (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Banque: {inst.banque || 'N/A'} {inst.agence ? `| ${inst.agence}` : ''}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tiré: {inst.tireNom || 'N/A'} {inst.cause ? `| Cause: ${inst.cause}` : ''}
                </Typography>
              )}

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color={inst.direction === 'IN' ? 'success.main' : 'warning.main'}
                >
                  {inst.direction === 'IN' ? '+' : '-'} {formattedAmount} {inst.devise}
                </Typography>

                <Stack direction="row" spacing={0.5}>
                  {inst.hasDocument && onDownloadDoc && (
                    <IconButton size="small" color="secondary" onClick={() => onDownloadDoc(inst)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" color="primary" onClick={() => onViewDetail(inst)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
