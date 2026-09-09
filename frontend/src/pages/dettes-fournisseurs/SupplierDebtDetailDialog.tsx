import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCardIcon from '@mui/icons-material/AddCard';
import CancelIcon from '@mui/icons-material/Cancel';
import type { DetteFournisseurView } from '../../features/dettes-fournisseurs/types';

interface SupplierDebtDetailDialogProps {
  open: boolean;
  onClose: () => void;
  dette: DetteFournisseurView | null;
  onAddPayment: (dette: DetteFournisseurView) => void;
  onCancelPayment: (dette: DetteFournisseurView, versementId: number) => void;
}

export const SupplierDebtDetailDialog: React.FC<SupplierDebtDetailDialogProps> = ({
  open,
  onClose,
  dette,
  onAddPayment,
  onCancelPayment,
}) => {
  if (!dette) return null;

  const paiements = dette.paiements || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Dette #{dette.numeroDette}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Réf. Facture Fournisseur: {dette.referenceFactureFournisseur || 'Non spécifiée'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Supplier and dates info */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Fournisseur
              </Typography>
              <Typography variant="body1" fontWeight={700} color="primary.main">
                {dette.nomFournisseurSnapshot}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Date Dette
              </Typography>
              <Typography variant="body2">{dette.dateDette}</Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Date Échéance
              </Typography>
              <Typography variant="body2" fontWeight={600} color={dette.estEnRetard ? 'error.main' : 'text.primary'}>
                {dette.dateEcheance} {dette.estEnRetard ? `(${dette.joursRetard}j de retard)` : ''}
              </Typography>
            </Grid>
          </Grid>

          <Divider />

          {/* Financial summary card */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Montant Dû
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {dette.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Payé
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {dette.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Solde Restant
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={dette.soldeRestant > 0 ? 'error.main' : 'success.main'}
                >
                  {dette.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {dette.remarques && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Remarques
              </Typography>
              <Typography variant="body2">{dette.remarques}</Typography>
            </Box>
          )}

          <Divider />

          {/* Versements section */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>
              Historique des versements ({paiements.length})
            </Typography>
            {dette.soldeRestant > 0 && (
              <Button
                variant="contained"
                size="small"
                color="success"
                startIcon={<AddCardIcon />}
                onClick={() => onAddPayment(dette)}
              >
                Ajouter un versement
              </Button>
            )}
          </Box>

          {paiements.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              Aucun versement n a encore été effectué pour cette dette.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>N° Versement</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Réf. Externe</TableCell>
                    <TableCell align="right">Montant</TableCell>
                    <TableCell align="center">Statut</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paiements.map((p) => (
                    <TableRow key={p.id} sx={{ opacity: p.estAnnule ? 0.6 : 1 }}>
                      <TableCell sx={{ fontWeight: 600 }}>{p.numeroPaiement}</TableCell>
                      <TableCell>{p.datePaiement}</TableCell>
                      <TableCell>{p.modePaiement}</TableCell>
                      <TableCell>{p.referenceExterne || '-'}</TableCell>
                      <TableCell align="right" style={{ fontWeight: 700 }}>
                        {p.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </TableCell>
                      <TableCell align="center">
                        {p.estAnnule ? (
                          <Chip label="ANNULÉ" color="error" size="small" variant="outlined" />
                        ) : (
                          <Chip label="ACTIF" color="success" size="small" variant="filled" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {!p.estAnnule && (
                          <Tooltip title="Annuler ce versement">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onCancelPayment(dette, p.id)}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};
