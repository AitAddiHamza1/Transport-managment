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
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader, StatCard } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import {
  usePaiementClientStats,
  usePaiementsClientsQuery,
} from '../../features/paiements-clients/usePaiementsClients';
import type { PaiementClient, PaiementMethode } from '../../features/paiements-clients/types';
import { CustomerPaymentsMobileList } from './CustomerPaymentsMobileList';
import { PaymentDetailDialog } from './PaymentDetailDialog';
import { PaymentFormDialog } from './PaymentFormDialog';

const METHODES: { value: PaiementMethode | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les modes' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'EFFET', label: 'Effet de commerce' },
  { value: 'PRELEVEMENT', label: 'Prélèvement automatique' },
];

export function CustomerPaymentsListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMethode, setSelectedMethode] = useState<string>('ALL');

  // Dialog state
  const [detailPaymentId, setDetailPaymentId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      methodePaiement: selectedMethode !== 'ALL' ? (selectedMethode as PaiementMethode) : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedMethode]);

  // Queries
  const { data: statsData } = usePaiementClientStats();
  const { data, isLoading, isError, error } = usePaiementsClientsQuery(queryParams);

  const paiements = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (selectedMethode && selectedMethode !== 'ALL'),
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
    setSelectedMethode('ALL');
    setPage(0);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Paiements clients"
        subtitle="Historique immuable des encaissements et règlements enregistrés sur les créances et factures"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Paiements clients', to: '/paiements-clients' },
          { label: 'Historique' },
        ]}
        action={
          <Can module="paiements_clients" action="ajouter">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsFormOpen(true)}
            >
              Nouveau règlement
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Total encaissements (MAD)"
            value={(statsData?.montantTotalRecu ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<CheckCircleOutlineIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Nombre de règlements"
            value={statsData?.totalPaiements ?? 0}
            icon={<PaymentsIcon />}
            iconBgColor="primary.light"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Modes de règlement"
            value={Object.keys(statsData?.methodesCount || {}).length}
            icon={<AccountBalanceWalletIcon />}
            iconBgColor="info.light"
            valueColor="info.main"
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
              value={selectedMethode}
              onChange={(e) => {
                setSelectedMethode(e.target.value);
                setPage(0);
              }}
              label="Mode de règlement"
              fullWidth
              size="small"
            >
              {METHODES.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des règlements.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>N° Règlement</TableCell>
              <TableCell>N° Facture</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Date règlement</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell align="right">Montant encaissé</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paiements.length > 0 ? (
              paiements.map((p: PaiementClient) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>
                      REG-{p.id.toString().padStart(4, '0')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {p.numeroFacture}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.nomClient}</TableCell>
                  <TableCell>{p.datePaiement}</TableCell>
                  <TableCell>
                    <Chip label={p.methodePaiement} color="primary" variant="outlined" size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {p.montantRecu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Consulter le règlement">
                        <IconButton size="small" color="info" onClick={() => setDetailPaymentId(p.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
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
                          Aucun règlement ne correspond aux critères sélectionnés.
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
                        <PaymentsIcon fontSize="large" />
                      </Avatar>
                      <Box text-align="center">
                        <Typography variant="h6" fontWeight={600}>
                          Aucun règlement enregistré
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Enregistrez votre premier règlement pour mettre à jour les créances.
                        </Typography>
                      </Box>
                      <Can module="paiements_clients" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setIsFormOpen(true)}>
                          Nouveau règlement
                        </Button>
                      </Can>
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
      <CustomerPaymentsMobileList
        paiements={paiements}
        onView={(p) => setDetailPaymentId(p.id)}
      />

      {/* Dialogs */}
      <PaymentDetailDialog
        open={detailPaymentId !== null}
        paymentId={detailPaymentId}
        onClose={() => setDetailPaymentId(null)}
      />

      <PaymentFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </Box>
  );
}
