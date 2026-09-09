import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';

import { PageHeader, StatCard } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import {
  FinancialMovement,
  GESTION_PAIEMENTS_METHODS,
  GESTION_PAIEMENTS_SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
} from '../../features/gestion-paiements/types';
import {
  useGestionPaiementsQuery,
  useGestionPaiementStatsQuery,
} from '../../features/gestion-paiements/useGestionPaiements';
import { PaymentManagementDetailDialog } from './PaymentManagementDetailDialog';
import { PaymentManagementMobileList } from './PaymentManagementMobileList';

export function PaymentManagementListPage() {
  const navigate = useNavigate();

  // Query State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    sourceType: sourceType || undefined,
    direction: direction || undefined,
    paymentMethod: paymentMethod || undefined,
    status: status || undefined,
    dateDebut: dateDebut || undefined,
    dateFin: dateFin || undefined,
  };

  // Queries
  const { data: listData, isLoading: isLoadingList, isError, refetch } = useGestionPaiementsQuery(queryParams);
  const { data: statsData, isLoading: isLoadingStats } = useGestionPaiementStatsQuery(queryParams);

  // Dialog State
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [selectedMovement, setSelectedMovement] = useState<FinancialMovement | null>(null);

  const movements = listData?.data || [];
  const meta = listData?.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Auto page correction
  useEffect(() => {
    if (meta.totalPages > 0 && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta.totalPages, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSourceType('');
    setDirection('');
    setPaymentMethod('');
    setStatus('ACTIVE');
    setDateDebut('');
    setDateFin('');
    setPage(1);
  };

  const handleOpenDetail = (movement: FinancialMovement) => {
    setSelectedMovement(movement);
    setDetailDialogOpen(true);
  };

  const numTotalIn = parseFloat(statsData?.totalIn || '0');
  const formattedTotalIn = !isNaN(numTotalIn)
    ? numTotalIn.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const numTotalOut = parseFloat(statsData?.totalOut || '0');
  const formattedTotalOut = !isNaN(numTotalOut)
    ? numTotalOut.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const numNet = parseFloat(statsData?.netBalance || '0');
  const formattedNet = !isNaN(numNet)
    ? numNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Gestion des paiements"
        subtitle="Vue consolidée des flux financiers, encaissements et décaissements de l'entreprise"
        breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Gestion des paiements' }]}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Can module="paiements_clients" action="ajouter">
              <Button
                variant="outlined"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => navigate('/paiements-clients')}
                size="small"
              >
                Paiement Client
              </Button>
            </Can>

            <Can module="paiements_fournisseurs" action="ajouter">
              <Button
                variant="outlined"
                color="warning"
                startIcon={<AddIcon />}
                onClick={() => navigate('/paiements-fournisseurs')}
                size="small"
              >
                Paiement Fournisseur
              </Button>
            </Can>

            <Can module="depenses_administratives" action="ajouter">
              <Button
                variant="outlined"
                color="info"
                startIcon={<AddIcon />}
                onClick={() => navigate('/charges-administratives')}
                size="small"
              >
                Charge Admin
              </Button>
            </Can>
          </Stack>
        }
      />

      {/* 4 StatCards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Encaissé (IN)"
            value={isLoadingStats ? '...' : `+ ${formattedTotalIn} MAD`}
            icon={<ArrowDownwardIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Décaissé (OUT)"
            value={isLoadingStats ? '...' : `- ${formattedTotalOut} MAD`}
            icon={<ArrowUpwardIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Solde Net (Encaissements - Décaissements)"
            value={isLoadingStats ? '...' : `${numNet >= 0 ? '+' : ''} ${formattedNet} MAD`}
            icon={<AccountBalanceWalletIcon />}
            iconBgColor={numNet >= 0 ? 'success.light' : 'error.light'}
            valueColor={numNet >= 0 ? 'success.main' : 'error.main'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Nombre de mouvements"
            value={isLoadingStats ? '...' : (statsData?.totalCount || 0).toString()}
            icon={<ReceiptLongIcon />}
            iconBgColor="primary.light"
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Card variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher par réf, tiers, client, fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Source"
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Toutes les sources</MenuItem>
              {GESTION_PAIEMENTS_SOURCE_TYPES.map((st) => (
                <MenuItem key={st} value={st}>
                  {SOURCE_TYPE_LABELS[st]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={3} md={1.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sens"
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="IN">IN (Encaissement)</MenuItem>
              <MenuItem value="OUT">OUT (Décaissement)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Mode de paiement"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les modes</MenuItem>
              {GESTION_PAIEMENTS_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                fullWidth
                size="small"
                label="Statut"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Tous (Actifs & Annulés)</MenuItem>
                <MenuItem value="ACTIVE">Actifs uniquement</MenuItem>
                <MenuItem value="CANCELLED">Annulés uniquement</MenuItem>
              </TextField>

              {(search || sourceType || direction || paymentMethod || status !== 'ACTIVE' || dateDebut || dateFin) && (
                <Tooltip title="Réinitialiser les filtres">
                  <IconButton color="secondary" onClick={handleResetFilters} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Main Content Area */}
      {isLoadingList ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ my: 3 }} action={<Button color="inherit" onClick={() => refetch()}>Réessayer</Button>}>
          Erreur lors du chargement des mouvements financiers.
        </Alert>
      ) : movements.length === 0 ? (
        <Card variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun mouvement financier trouvé
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ajustez vos filtres de recherche pour consulter les mouvements enregistrés.
          </Typography>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date & Réf</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Source & Sens</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tiers</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Montant</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Statut</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((m) => {
                  const numAmount = parseFloat(m.amount);
                  const formattedAmount = !isNaN(numAmount)
                    ? numAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : m.amount;

                  return (
                    <TableRow key={m.movementId} hover sx={{ opacity: m.isCancelled ? 0.65 : 1 }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {m.reference}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(m.date).toLocaleDateString('fr-FR')}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={m.direction}
                            size="small"
                            color={m.direction === 'IN' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                          <Chip
                            label={SOURCE_TYPE_LABELS[m.sourceType] || m.sourceType}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {m.party.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.party.type}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip label={m.paymentMethod} size="small" variant="outlined" />
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={m.direction === 'IN' ? 'success.main' : 'warning.main'}
                        >
                          {m.direction === 'IN' ? '+' : '-'} {formattedAmount} {m.currency}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {m.isCancelled ? (
                          <Chip label="Annulé" size="small" color="error" />
                        ) : (
                          <Chip label="Actif" size="small" color="success" variant="outlined" />
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Consulter le détail du mouvement">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDetail(m)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile Card List */}
          <PaymentManagementMobileList movements={movements} onView={handleOpenDetail} />

          {/* Server Pagination */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <TablePagination
              component="div"
              count={meta.total}
              page={page - 1}
              onPageChange={(_, newPage) => setPage(newPage + 1)}
              rowsPerPage={limit}
              onRowsPerPageChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Mouvements par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </Box>
        </>
      )}

      {/* Detail Dialog */}
      <PaymentManagementDetailDialog
        open={detailDialogOpen}
        movement={selectedMovement}
        onClose={() => setDetailDialogOpen(false)}
      />
    </Box>
  );
}
