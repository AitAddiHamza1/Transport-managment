import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import type { PaiementFournisseurGlobalView } from '../../features/paiements-fournisseurs/types';

interface SupplierPaymentsMobileListProps {
  paiements: PaiementFournisseurGlobalView[];
  onCancel: (paiement: PaiementFournisseurGlobalView) => void;
}

export const SupplierPaymentsMobileList: React.FC<SupplierPaymentsMobileListProps> = ({
  paiements,
  onCancel,
}) => {
  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {paiements.map((p) => (
        <Card
          key={p.id}
          variant="outlined"
          sx={{
            borderRadius: 2,
            opacity: p.estAnnule ? 0.6 : 1,
            backgroundColor: p.estAnnule ? 'action.disabledBackground' : 'background.paper',
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack spacing={1.5}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {p.numeroPaiement}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dette: {p.numeroDette} {p.referenceFactureFournisseur ? `(${p.referenceFactureFournisseur})` : ''}
                  </Typography>
                </Box>
                {p.estAnnule ? (
                  <Chip label="ANNULÉ" color="error" size="small" variant="outlined" />
                ) : (
                  <Chip label="ACTIF" color="success" size="small" variant="filled" />
                )}
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  {p.nomFournisseurSnapshot}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color={p.estAnnule ? 'text.secondary' : 'success.main'}>
                  {p.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center" bgcolor="action.hover" p={1} borderRadius={1}>
                <Typography variant="caption" color="text.secondary">
                  Mode: {p.modePaiement} {p.referenceExterne ? `| ${p.referenceExterne}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Date: {p.datePaiement}
                </Typography>
              </Box>

              {p.estAnnule && p.motifAnnulation && (
                <Typography variant="caption" color="error.main">
                  Motif d annulation: {p.motifAnnulation}
                </Typography>
              )}

              {!p.estAnnule && (
                <Box display="flex" justifyContent="flex-end">
                  <Tooltip title="Annuler ce versement">
                    <IconButton size="small" color="error" onClick={() => onCancel(p)}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};
