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
import {
  FinancialMovement,
  SOURCE_TYPE_LABELS,
} from '../../features/gestion-paiements/types';

interface PaymentManagementMobileListProps {
  movements: FinancialMovement[];
  onView: (movement: FinancialMovement) => void;
}

export function PaymentManagementMobileList({
  movements,
  onView,
}: PaymentManagementMobileListProps) {
  if (movements.length === 0) return null;

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {movements.map((m) => {
        const numAmount = parseFloat(m.amount);
        const formattedAmount = !isNaN(numAmount)
          ? numAmount.toLocaleString('fr-FR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : m.amount;

        return (
          <Card key={m.movementId} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(m.date).toLocaleDateString('fr-FR')} — Réf: {m.reference}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {m.party.name}
                  </Typography>
                </Box>

                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={m.direction === 'IN' ? 'success.main' : 'warning.main'}
                >
                  {m.direction === 'IN' ? '+' : '-'} {formattedAmount} {m.currency}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <Chip
                  size="small"
                  label={m.direction === 'IN' ? 'Encaissement' : 'Décaissement'}
                  color={m.direction === 'IN' ? 'success' : 'warning'}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={SOURCE_TYPE_LABELS[m.sourceType] || m.sourceType}
                  color="primary"
                  variant="outlined"
                />
                {m.isCancelled && <Chip size="small" label="Annulé" color="error" />}
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px solid #f1f5f9">
                <Typography variant="caption" color="text.secondary">
                  Mode: {m.paymentMethod}
                </Typography>

                <IconButton size="small" color="primary" onClick={() => onView(m)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
