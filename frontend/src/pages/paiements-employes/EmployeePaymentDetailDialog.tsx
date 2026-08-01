import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState } from 'react';
import { usePaiementEmployeQuery } from '../../features/paiements-employes/usePaiementsEmployes';
import { Can } from '../../components/shared/Can';
import type { StatutPaiementEmployeUnion, VersementView } from '../../features/paiements-employes/types';
import { AddVersementDialog } from './AddVersementDialog';
import { CancelVersementDialog } from './CancelVersementDialog';
import { formatPeriodeFr } from './utils';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';

interface EmployeePaymentDetailDialogProps {
  open: boolean;
  paymentId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<
  StatutPaiementEmployeUnion,
  { label: string; color: 'default' | 'warning' | 'success' }
> = {
  EN_ATTENTE: { label: 'En attente', color: 'default' },
  PARTIELLEMENT_PAYE: { label: 'Partiellement payé', color: 'warning' },
  PAYE: { label: 'Payé', color: 'success' },
};

export function EmployeePaymentDetailDialog({
  open,
  paymentId,
  onClose,
}: EmployeePaymentDetailDialogProps) {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  const { data: paiement, isLoading, isError, error } = usePaiementEmployeQuery(paymentId);

  // Versement action states
  const [isAddVersementOpen, setIsAddVersementOpen] = useState(false);
  const [cancelVersementTarget, setCancelVersementTarget] = useState<VersementView | null>(null);

  if (!paymentId) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Engagement de paiement #{paiement?.numeroPaiement || paymentId}
            </Typography>
            {paiement && (
              <Typography variant="body2" color="text.secondary">
                Période: {formatPeriodeFr(paiement.periode)} ({paiement.periode})
              </Typography>
            )}
          </Box>
          {paiement && (
            <Chip
              label={STATUT_CONFIG[paiement.statut]?.label || paiement.statut}
              color={STATUT_CONFIG[paiement.statut]?.color || 'default'}
            />
          )}
        </DialogTitle>

        <DialogContent dividers>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {isError && (
            <Alert severity="error">
              {(error as any)?.response?.data?.message || 'Erreur lors du chargement des détails.'}
            </Alert>
          )}

          {paiement && (
            <Stack spacing={3}>
              {/* Employee Summary Banner */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Employé
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {paiement.employe
                        ? `${paiement.employe.nom} ${paiement.employe.prenom}`
                        : `Employé #${paiement.idEmploye}`}
                    </Typography>
                    {paiement.employe && (
                      <Typography variant="body2" color="text.secondary">
                        Matricule: {paiement.employe.matricule} — {paiement.employe.poste}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Département
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {paiement.employe?.departement || 'Non spécifié'}
                    </Typography>
                    {paiement.employe?.cin && (
                      <Typography variant="body2" color="text.secondary">
                        CIN: {paiement.employe.cin}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              {/* Financial Snapshot Summary Grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Salaire de référence
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {paiement.salaireReference.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Montant dû
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {paiement.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                    <Typography variant="caption" color="text.secondary">
                      Total versé
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {paiement.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                    <Typography variant="caption" color="text.secondary">
                      Solde restant
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      {paiement.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Adjustment Reason & Notes */}
              {(paiement.motifAjustement || paiement.notes) && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  {paiement.motifAjustement && (
                    <Box sx={{ mb: paiement.notes ? 1.5 : 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Motif d’ajustement du salaire de référence:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        {paiement.motifAjustement}
                      </Typography>
                    </Box>
                  )}
                  {paiement.notes && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Notes & Remarques:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        {paiement.notes}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Versement History Table */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Historique des versements ({paiement.versements.length})
                  </Typography>

                  <Can module="paiements_employes" action="ajouter">
                    {paiement.soldeRestant > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setIsAddVersementOpen(true)}
                      >
                        Ajouter un versement
                      </Button>
                    )}
                  </Can>
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>N° Versement</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Mode</TableCell>
                        <TableCell>Réf. externe</TableCell>
                        <TableCell align="right">Montant</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paiement.versements.length > 0 ? (
                        paiement.versements.map((v) => (
                          <TableRow
                            key={v.id}
                            hover
                            sx={{
                              bgcolor: v.estAnnule ? 'action.hover' : 'inherit',
                              opacity: v.estAnnule ? 0.65 : 1,
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                VERS-{v.id.toString().padStart(4, '0')}
                              </Typography>
                            </TableCell>
                            <TableCell>{v.dateVersement}</TableCell>
                            <TableCell>
                              <Chip label={v.modePaiement} variant="outlined" size="small" />
                            </TableCell>
                            <TableCell>{v.referenceExterne || '—'}</TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{
                                  textDecoration: v.estAnnule ? 'line-through' : 'none',
                                  color: v.estAnnule ? 'text.disabled' : 'success.main',
                                }}
                              >
                                {v.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {v.estAnnule ? (
                                <Tooltip title={`Motif: ${v.motifAnnulation || 'Non précisé'} (le ${v.dateAnnulation ? v.dateAnnulation.split('T')[0] : ''})`}>
                                  <Chip label="Annulé" color="error" variant="outlined" size="small" />
                                </Tooltip>
                              ) : (
                                <Chip label="Valide" color="success" size="small" icon={<CheckCircleIcon />} />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Can module="paiements_employes" action="modifier">
                                {!v.estAnnule && (
                                  <Tooltip title="Annuler ce versement">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => setCancelVersementTarget(v)}
                                    >
                                      <BlockIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Can>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            Aucun versement n’a encore été enregistré pour cet engagement.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Timestamps audit */}
              <Box sx={{ pt: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Créé le: {new Date(paiement.creeLe).toLocaleString('fr-FR')} — Mis à jour le: {new Date(paiement.misAJourLe).toLocaleString('fr-FR')}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Sub-Dialogs */}
      {paiement && (
        <AddVersementDialog
          open={isAddVersementOpen}
          paiement={paiement}
          onClose={() => setIsAddVersementOpen(false)}
        />
      )}

      {paiement && (
        <CancelVersementDialog
          open={cancelVersementTarget !== null}
          idPaiementEmploye={paiement.id}
          versement={cancelVersementTarget}
          onClose={() => setCancelVersementTarget(null)}
        />
      )}
    </>
  );
}
