import React, { useState } from 'react';
import {
  Box,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

import {
  useGlobalPaiementsFournisseursQuery,
  useGlobalPaiementFournisseurStatsQuery,
} from '../../features/paiements-fournisseurs/usePaiementsFournisseurs';
import { useFournisseursQuery } from '../../features/fournisseurs/useFournisseurs';
import type { PaiementFournisseurGlobalView } from '../../features/paiements-fournisseurs/types';

import { StatCard, EmptyState, SearchField } from '../../components/shared';

import { SupplierPaymentsMobileList } from './SupplierPaymentsMobileList';
import { CancelSupplierPaymentDialog } from './CancelSupplierPaymentDialog';

export const SupplierPaymentsListPage: React.FC = () => {
  // Query parameters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [idFournisseurFilter, setIdFournisseurFilter] = useState<number | ''>('');
  const [modeFilter, setModeFilter] = useState<string>('');
  const [annuleFilter, setAnnuleFilter] = useState<boolean | ''>('');

  // Dialog states
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState<PaiementFournisseurGlobalView | null>(null);

  // Queries
  const { data: suppliersData } = useFournisseursQuery({ limit: 100 });
  const suppliers = suppliersData?.data || [];

  const queryParams = {
    page,
    limit: 10,
    search: search.trim() || undefined,
    idFournisseur: idFournisseurFilter !== '' ? Number(idFournisseurFilter) : undefined,
    modePaiement: modeFilter || undefined,
    estAnnule: annuleFilter !== '' ? Boolean(annuleFilter) : undefined,
  };

  const { data: paiementsRes, isLoading: isLoadingPaiements } =
    useGlobalPaiementsFournisseursQuery(queryParams);
  const { data: statsData } = useGlobalPaiementFournisseurStatsQuery(queryParams);

  const paiements = paiementsRes?.data || [];

  const handleCancelTrigger = (p: PaiementFournisseurGlobalView) => {
    setSelectedPaiement(p);
    setIsCancelDialogOpen(true);
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Paiements fournisseurs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historique complet des règlements et versements effectués aux fournisseurs
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Règlements (Période)"
            value={`${(statsData?.totalPayePeriod || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
            helperText="Volume des règlements validés"
            iconBgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Versements Validés"
            value={statsData?.paymentsCount || 0}
            helperText="Opérations exécutées"
            iconBgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Modes de Paiement"
            value={statsData?.activeMethodsCount || 0}
            helperText="Canaux utilisés"
            iconBgColor="info.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Versements Annulés"
            value={statsData?.cancelledCount || 0}
            helperText="Opérations d annulation"
            iconBgColor={(statsData?.cancelledCount || 0) > 0 ? 'error.light' : 'success.light'}
          />
        </Grid>
      </Grid>

      {/* Filters Bar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <SearchField
              value={search}
              onChange={(val: string) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Rechercher par N° versement, N° dette, fournisseur, réf..."
            />
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Fournisseur"
              value={idFournisseurFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIdFournisseurFilter(e.target.value === '' ? '' : Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les fournisseurs</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.nomFournisseur}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Mode de paiement"
              value={modeFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setModeFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les modes</MenuItem>
              <MenuItem value="VIREMENT">VIREMENT</MenuItem>
              <MenuItem value="CHEQUE">CHÈQUE</MenuItem>
              <MenuItem value="ESPECES">ESPÈCES</MenuItem>
              <MenuItem value="CARTE">CARTE BANCAIRE</MenuItem>
              <MenuItem value="EFFET">EFFET DE COMMERCE</MenuItem>
              <MenuItem value="PRELEVEMENT">PRÉLÈVEMENT</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Statut"
              value={annuleFilter === '' ? '' : String(annuleFilter)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setAnnuleFilter(e.target.value === '' ? '' : e.target.value === 'true');
                setPage(1);
              }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="false">Actifs uniquement</MenuItem>
              <MenuItem value="true">Annulés uniquement</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>N° Versement</TableCell>
                <TableCell>N° Dette</TableCell>
                <TableCell>Fournisseur</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Réf. Externe</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingPaiements ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    Chargement des paiements...
                  </TableCell>
                </TableRow>
              ) : paiements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState
                      title="Aucun paiement fournisseur trouvé"
                      description="Aucun enregistrement de versement ne correspond à vos filtres."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paiements.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{
                      opacity: p.estAnnule ? 0.6 : 1,
                      backgroundColor: p.estAnnule ? 'action.disabledBackground' : undefined,
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{p.numeroPaiement}</TableCell>
                    <TableCell>{p.numeroDette}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2' }}>
                      {p.nomFournisseurSnapshot}
                    </TableCell>
                    <TableCell>{p.datePaiement}</TableCell>
                    <TableCell>{p.modePaiement}</TableCell>
                    <TableCell>{p.referenceExterne || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
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
                            onClick={() => handleCancelTrigger(p)}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile View */}
      <SupplierPaymentsMobileList paiements={paiements} onCancel={handleCancelTrigger} />

      {/* Cancel Dialog */}
      {isCancelDialogOpen && selectedPaiement && (
        <CancelSupplierPaymentDialog
          open={isCancelDialogOpen}
          onClose={() => setIsCancelDialogOpen(false)}
          dette={{
            id: selectedPaiement.idDetteFournisseur,
            numeroDette: selectedPaiement.numeroDette,
            soldeRestant: 0, // will be refetched
          } as any}
          versementId={selectedPaiement.id}
        />
      )}
    </Stack>
  );
};
