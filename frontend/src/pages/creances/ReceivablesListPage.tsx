import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PaymentsIcon from '@mui/icons-material/Payments';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader, StatCard } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { useCreanceStats, useCreancesQuery } from '../../features/creances/useCreances';
import type { CreanceClient, CreanceStatut } from '../../features/creances/types';
import { ReceivablesMobileList } from './ReceivablesMobileList';
import { ReceivableDetailDialog } from './ReceivableDetailDialog';
import { PaymentFormDialog } from '../paiements-clients/PaymentFormDialog';

const STATUT_CONFIG: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'success' | 'default' }
> = {
  NON_PAYE: { label: 'Non payé', color: 'error' },
  PARTIEL: { label: 'Partiel', color: 'warning' },
  PAYE: { label: 'Payé', color: 'success' },
  EN_RETARD: { label: 'En retard', color: 'error' },
};

export function ReceivablesListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');

  // Dialog state
  const [detailCreanceId, setDetailCreanceId] = useState<number | null>(null);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentPreselectedFacture, setPaymentPreselectedFacture] = useState<string | undefined>(undefined);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Query params
  const queryParams = useMemo(() => {
    return {
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      statutPaiement: selectedStatut !== 'ALL' ? (selectedStatut as CreanceStatut) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut]);

  // Queries
  const { data: statsData } = useCreanceStats();
  const { data, isLoading, isError, error } = useCreancesQuery(queryParams);

  const creances = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (selectedStatut && selectedStatut !== 'ALL'),
  );

  // Page auto-correction on page decrease
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  // Reset filters handler
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedStatut('ALL');
    setPage(0);
  };

  const handleOpenPaymentForInvoice = (numFacture?: string) => {
    setPaymentPreselectedFacture(numFacture);
    setIsPaymentFormOpen(true);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Créances clients"
        subtitle="Suivi des factures émises, montants encaiassés, soldes restants et échéances de paiement"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Créances clients', to: '/creances' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="paiements_clients" action="ajouter">
            <Button
              variant="contained"
              startIcon={<PaymentsIcon />}
              onClick={() => handleOpenPaymentForInvoice(undefined)}
            >
              Enregistrer un règlement
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total créances"
            value={statsData?.totalCreances ?? 0}
            icon={<RequestQuoteIcon />}
            iconBgColor="primary.light"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Montant total (MAD)"
            value={(statsData?.totalMontantFacture ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<AccountBalanceWalletIcon />}
            iconBgColor="info.light"
            valueColor="info.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Encaissements (MAD)"
            value={(statsData?.totalMontantRecu ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<CheckCircleOutlineIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Solde restant (MAD)"
            value={(statsData?.totalSolde ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<WarningAmberIcon />}
            iconBgColor="error.light"
            valueColor="error.main"
          />
        </Grid>
      </Grid>

      {/* Filters Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par N° facture, client..."
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              value={selectedStatut}
              onChange={(e) => {
                setSelectedStatut(e.target.value);
                setPage(0);
              }}
              label="Statut de paiement"
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              <MenuItem value="NON_PAYE">Non payé</MenuItem>
              <MenuItem value="PARTIEL">Partiellement payé</MenuItem>
              <MenuItem value="PAYE">Payé</MenuItem>
              <MenuItem value="EN_RETARD">En retard</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading Progress */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des créances.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>N° Facture</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Date émission</TableCell>
              <TableCell>Échéance</TableCell>
              <TableCell align="right">Montant Facture</TableCell>
              <TableCell align="right">Déjà encaissé</TableCell>
              <TableCell align="right">Solde restant</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {creances.length > 0 ? (
              creances.map((c: CreanceClient) => {
                const statusCfg = STATUT_CONFIG[c.statutPaiement] || { label: c.statutPaiement, color: 'default' as any };
                const isPaid = c.statutPaiement === 'PAYE' || c.solde <= 0;

                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {c.numeroFacture}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.nomClient}</TableCell>
                    <TableCell>{c.dateEmission}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color={c.statutPaiement === 'EN_RETARD' ? 'error.main' : 'text.primary'}>
                        {c.dateEcheance || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {c.montantFacture.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {c.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color={isPaid ? 'success.main' : 'error.main'}>
                        {c.solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter le détail">
                          <IconButton size="small" color="info" onClick={() => setDetailCreanceId(c.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {!isPaid && (
                          <Can module="paiements_clients" action="ajouter">
                            <Tooltip title="Enregistrer un règlement">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOpenPaymentForInvoice(c.numeroFacture)}
                              >
                                <PaymentsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Can>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  {hasActiveFilters ? (
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                        <SearchIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun résultat trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Aucune créance ne correspond aux critères sélectionnés.
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FilterAltOffIcon />}
                        onClick={handleResetFilters}
                      >
                        Réinitialiser les filtres
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                        <RequestQuoteIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucune créance enregistrée
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Les créances sont générées automatiquement lors de la création de factures.
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={meta.total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page :"
        />
      </TableContainer>

      {/* Mobile Card List */}
      <ReceivablesMobileList
        creances={creances}
        onView={(c) => setDetailCreanceId(c.id)}
        onPay={(c) => handleOpenPaymentForInvoice(c.numeroFacture)}
      />

      {/* Dialogs */}
      <ReceivableDetailDialog
        open={detailCreanceId !== null}
        creanceId={detailCreanceId}
        onClose={() => setDetailCreanceId(null)}
        onOpenPayment={(numFacture) => handleOpenPaymentForInvoice(numFacture)}
      />

      <PaymentFormDialog
        open={isPaymentFormOpen}
        preselectedNumeroFacture={paymentPreselectedFacture}
        onClose={() => {
          setIsPaymentFormOpen(false);
          setPaymentPreselectedFacture(undefined);
        }}
      />
    </Box>
  );
}
