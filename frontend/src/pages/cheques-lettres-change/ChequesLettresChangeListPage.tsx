import React, { useState, useEffect } from 'react';
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
  Tab,
  Tabs,
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
import DownloadIcon from '@mui/icons-material/Download';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import { PageHeader, StatCard } from '../../components/shared';
import {
  PaymentInstrumentView,
  StatutInstrumentBancaire,
  STATUT_BANCAIRE_COLORS,
  STATUT_BANCAIRE_LABELS,
} from '../../features/cheques-lettres-change/types';
import {
  useChequesLettresChangeQuery,
  useChequesLettresChangeStatsQuery,
} from '../../features/cheques-lettres-change/useChequesLettresChange';
import { InstrumentDetailDialog } from './InstrumentDetailDialog';
import { ChequesLettresChangeMobileList } from './ChequesLettresChangeMobileList';
import { chequesApi } from '../../features/cheques/chequesApi';
import { lettresDeChangeApi } from '../../features/lettres-de-change/lettresDeChangeApi';

export function ChequesLettresChangeListPage() {
  // Active Tab: 0 = Chèques, 1 = Lettres de change
  const [activeTab, setActiveTab] = useState<number>(0);

  // Query State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [statutBancaire, setStatutBancaire] = useState<string>('');
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

  const currentType = activeTab === 0 ? 'CHEQUE' : 'LETTRE_DE_CHANGE';

  const queryParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    type: currentType as 'CHEQUE' | 'LETTRE_DE_CHANGE',
    source: (source || undefined) as 'CLIENT' | 'FOURNISSEUR' | undefined,
    statutBancaire: (statutBancaire || undefined) as StatutInstrumentBancaire | undefined,
    dateDebut: dateDebut || undefined,
    dateFin: dateFin || undefined,
  };

  // Queries
  const { data: listData, isLoading: isLoadingList, isError, refetch } = useChequesLettresChangeQuery(queryParams);
  const { data: statsData, isLoading: isLoadingStats } = useChequesLettresChangeStatsQuery();

  // Dialog state
  const [selectedInstrument, setSelectedInstrument] = useState<PaymentInstrumentView | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);

  const instruments = listData?.data || [];
  const meta = listData?.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Auto page correction
  useEffect(() => {
    if (meta.totalPages > 0 && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta.totalPages, page]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSource('');
    setStatutBancaire('');
    setDateDebut('');
    setDateFin('');
    setPage(1);
  };

  const handleOpenDetail = (inst: PaymentInstrumentView) => {
    setSelectedInstrument(inst);
    setDetailDialogOpen(true);
  };

  const handleDownloadDoc = async (inst: PaymentInstrumentView) => {
    try {
      if (inst.instrumentType === 'CHEQUE') {
        await chequesApi.downloadDocument(inst.id, `chq-${inst.numero}`);
      } else {
        await lettresDeChangeApi.downloadDocument(inst.id, `lc-${inst.numero}`);
      }
    } catch (err) {
      alert('Erreur lors du téléchargement du document.');
    }
  };

  // Format monetary stats cleanly per currency
  const formatCurrencies = (dict?: Record<string, number>) => {
    if (!dict || Object.keys(dict).length === 0) return '0,00 MAD';
    return Object.entries(dict)
      .map(([cur, val]) => `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`)
      .join(' | ');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Chèques & Lettres de change"
        subtitle="Suivi bancaire des chèques et lettres de change clients et fournisseurs"
      />

      {/* KPI Header Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Chèques"
            value={isLoadingStats ? '...' : `${statsData?.totalChequesCount || 0} (${formatCurrencies(statsData?.totalChequesAmountByCurrency)})`}
            icon={<AccountBalanceIcon />}
            iconBgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Lettres de change"
            value={isLoadingStats ? '...' : `${statsData?.totalLettresCount || 0} (${formatCurrencies(statsData?.totalLettresAmountByCurrency)})`}
            icon={<DescriptionIcon />}
            iconBgColor="secondary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="En portefeuille"
            value={isLoadingStats ? '...' : (statsData?.byStatusCount?.EN_PORTEFEUILLE || 0).toString()}
            icon={<HourglassEmptyIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Déposés & Encaissés"
            value={
              isLoadingStats
                ? '...'
                : ((statsData?.byStatusCount?.DEPOSE_EN_BANQUE || 0) + (statsData?.byStatusCount?.ENCAISSE || 0)).toString()
            }
            icon={<CheckCircleOutlineIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar & Tabs */}
      <Card variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Chèques" />
            <Tab label="Lettres de change" />
          </Tabs>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder={
                activeTab === 0
                  ? 'Rechercher par N° chèque, banque, série, tiers...'
                  : 'Rechercher par N° lettre, tiré, cause, tiers...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Toutes les sources</MenuItem>
              <MenuItem value="CLIENT">Client (Encaissement IN)</MenuItem>
              <MenuItem value="FOURNISSEUR">Fournisseur (Décaissement OUT)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} sm={3} md={3.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Statut Bancaire"
              value={statutBancaire}
              onChange={(e) => {
                setStatutBancaire(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="EN_PORTEFEUILLE">{STATUT_BANCAIRE_LABELS.EN_PORTEFEUILLE}</MenuItem>
              <MenuItem value="DEPOSE_EN_BANQUE">{STATUT_BANCAIRE_LABELS.DEPOSE_EN_BANQUE}</MenuItem>
              <MenuItem value="ENCAISSE">{STATUT_BANCAIRE_LABELS.ENCAISSE}</MenuItem>
              <MenuItem value="REJETE_IMPAYE">{STATUT_BANCAIRE_LABELS.REJETE_IMPAYE}</MenuItem>
              <MenuItem value="ANNULE">{STATUT_BANCAIRE_LABELS.ANNULE}</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {(search || source || statutBancaire || dateDebut || dateFin) && (
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

      {/* Content Area */}
      {isLoadingList ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ my: 3 }} action={<Button color="inherit" onClick={() => refetch()}>Réessayer</Button>}>
          Erreur lors du chargement des instruments bancaires.
        </Alert>
      ) : instruments.length === 0 ? (
        <Card variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun {activeTab === 0 ? 'chèque' : 'lettre de change'} trouvé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ajustez vos filtres pour consulter les enregistrements du suivi bancaire.
          </Typography>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Source & Sens</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {activeTab === 0 ? 'N° Chèque & Série' : 'N° Lettre'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {activeTab === 0 ? 'Date Chèque' : "Date d'échéance"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {activeTab === 0 ? 'Banque & Agence' : 'Tiré & Cause'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tiers / Bénéficiaire</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Montant</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Statut Bancaire</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Scan</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instruments.map((inst) => {
                  const numAmount = inst.montant;
                  const formattedAmount = !isNaN(numAmount)
                    ? numAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0,00';

                  return (
                    <TableRow key={`${inst.instrumentType}-${inst.id}`} hover sx={{ opacity: inst.isPaymentCancelled ? 0.65 : 1 }}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={inst.source === 'CLIENT' ? 'Client (IN)' : 'Fournisseur (OUT)'}
                            size="small"
                            color={inst.direction === 'IN' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {inst.numero}
                        </Typography>
                        {inst.serie && (
                          <Typography variant="caption" color="text.secondary">
                            Série : {inst.serie}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {inst.date ? new Date(inst.date).toLocaleDateString('fr-FR') : 'N/A'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {activeTab === 0 ? (
                          <>
                            <Typography variant="body2" fontWeight="medium">
                              {inst.banque || 'N/A'}
                            </Typography>
                            {inst.agence && (
                              <Typography variant="caption" color="text.secondary">
                                Agence : {inst.agence}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" fontWeight="medium">
                              {inst.tireNom || 'N/A'}
                            </Typography>
                            {inst.cause && (
                              <Typography variant="caption" color="text.secondary">
                                Cause : {inst.cause}
                              </Typography>
                            )}
                          </>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {inst.partyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Bénéficiaire : {inst.beneficiaire}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={inst.direction === 'IN' ? 'success.main' : 'warning.main'}
                        >
                          {inst.direction === 'IN' ? '+' : '-'} {formattedAmount} {inst.devise}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={STATUT_BANCAIRE_LABELS[inst.statutBancaire] || inst.statutBancaire}
                          color={STATUT_BANCAIRE_COLORS[inst.statutBancaire]}
                          size="small"
                        />
                      </TableCell>

                      <TableCell align="center">
                        {inst.hasDocument ? (
                          <Tooltip title="Scan attaché — cliquer pour télécharger">
                            <IconButton size="small" color="secondary" onClick={() => handleDownloadDoc(inst)}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Aucun
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Consulter la fiche et modifier le statut">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDetail(inst)}>
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

          {/* Mobile Card List View */}
          <ChequesLettresChangeMobileList
            instruments={instruments}
            onViewDetail={handleOpenDetail}
            onDownloadDoc={handleDownloadDoc}
          />

          {/* Pagination */}
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
              labelRowsPerPage="Instruments par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </Box>
        </>
      )}

      {/* Detail & Status Modal */}
      <InstrumentDetailDialog
        open={detailDialogOpen}
        instrument={selectedInstrument}
        onClose={() => setDetailDialogOpen(false)}
        onRefetch={refetch}
      />
    </Box>
  );
}
