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
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, StatCard, ConfirmDialog } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { useEmployesQuery } from '../../features/employes/useEmployes';
import {
  useDeletePaiementEmploye,
  usePaiementEmployeStats,
  usePaiementsEmployesQuery,
} from '../../features/paiements-employes/usePaiementsEmployes';
import type {
  PaiementEmployeView,
  PaiementModeEmploye,
  StatutPaiementEmployeUnion,
} from '../../features/paiements-employes/types';
import { EmployeePaymentsMobileList } from './EmployeePaymentsMobileList';
import { formatPeriodeFr } from './utils';
import { EmployeePaymentFormDialog } from './EmployeePaymentFormDialog';
import { AddVersementDialog } from './AddVersementDialog';
import { EmployeePaymentDetailDialog } from './EmployeePaymentDetailDialog';
import { notify } from '../../utils/notify';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';

const STATUT_OPTIONS: { value: StatutPaiementEmployeUnion | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'PARTIELLEMENT_PAYE', label: 'Partiellement payé' },
  { value: 'PAYE', label: 'Payé' },
];

const MODES_PAIEMENT: { value: PaiementModeEmploye | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les modes' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
];

const STATUT_CONFIG: Record<
  StatutPaiementEmployeUnion,
  { label: string; color: 'default' | 'warning' | 'success' }
> = {
  EN_ATTENTE: { label: 'En attente', color: 'default' },
  PARTIELLEMENT_PAYE: { label: 'Partiellement payé', color: 'warning' },
  PAYE: { label: 'Payé', color: 'success' },
};

export function EmployeePaymentsListPage() {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  const [searchParams] = useSearchParams();
  const urlEmployeId = searchParams.get('idEmploye');

  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters state
  const [selectedEmployeId, setSelectedEmployeId] = useState<string>(urlEmployeId || 'ALL');
  const [selectedPeriode, setSelectedPeriode] = useState<string>('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [departement, setDepartement] = useState<string>('');

  // Sync urlParam
  useEffect(() => {
    if (urlEmployeId) {
      setSelectedEmployeId(urlEmployeId);
    }
  }, [urlEmployeId]);

  // Dialogs state
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PaiementEmployeView | null>(null);
  const [detailPaymentId, setDetailPaymentId] = useState<number | null>(null);
  const [addVersementTarget, setAddVersementTarget] = useState<PaiementEmployeView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaiementEmployeView | null>(null);

  // Employes list for filter
  const { data: employesData } = useEmployesQuery({ limit: 100 });
  const employesList = employesData?.data || [];

  const deleteMutation = useDeletePaiementEmploye();

  // Debounce search input
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
      search: debouncedSearch.trim() || undefined,
      idEmploye: selectedEmployeId !== 'ALL' ? Number(selectedEmployeId) : undefined,
      periode: selectedPeriode.trim() || undefined,
      statut: selectedStatut !== 'ALL' ? (selectedStatut as StatutPaiementEmployeUnion) : undefined,
      modePaiement: selectedMode !== 'ALL' ? (selectedMode as PaiementModeEmploye) : undefined,
      departement: departement.trim() || undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedEmployeId, selectedPeriode, selectedStatut, selectedMode, departement]);

  // API Queries
  const { data: statsData } = usePaiementEmployeStats(queryParams);
  const { data, isLoading, isError, error } = usePaiementsEmployesQuery(queryParams);

  const paiements = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      (selectedEmployeId && selectedEmployeId !== 'ALL') ||
      selectedPeriode.trim() ||
      (selectedStatut && selectedStatut !== 'ALL') ||
      (selectedMode && selectedMode !== 'ALL') ||
      departement.trim(),
  );

  // Auto-correct page if total pages decreases
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedEmployeId('ALL');
    setSelectedPeriode('');
    setSelectedStatut('ALL');
    setSelectedMode('ALL');
    setDepartement('');
    setPage(0);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      notify.success(`Engagement ${deleteTarget.numeroPaiement} supprimé avec succès`);
      setDeleteTarget(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Une erreur s’est produite lors de la suppression.';
      notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const periodLabel = selectedPeriode ? formatPeriodeFr(selectedPeriode) : 'Toutes périodes';

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Paiements employés"
        subtitle={`Suivi et enregistrement des versements et engagements de salaire des employés (${periodLabel})`}
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'RH', to: '/employes' },
          { label: 'Paiements employés' },
        ]}
        action={
          <Can module="paiements_employes" action="ajouter">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateFormOpen(true)}
            >
              Nouvel engagement
            </Button>
          </Can>
        }
      />

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            label={`Total dû (${currency})`}
            value={(statsData?.totalDu ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<PaymentsIcon />}
            iconBgColor="primary.light"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            label={`Total payé (${currency})`}
            value={(statsData?.totalPaye ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<CheckCircleOutlineIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            label={`Solde restant (${currency})`}
            value={(statsData?.soldeRestant ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<AccountBalanceWalletIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            label="En attente"
            value={statsData?.countAttente ?? 0}
            icon={<HourglassEmptyIcon />}
            iconBgColor="action.hover"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            label="Partiellement payés"
            value={statsData?.countPartiel ?? 0}
            icon={<PaymentsIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            label="Soldés / Payés"
            value={statsData?.countPaye ?? 0}
            icon={<CheckCircleOutlineIcon />}
            iconBgColor="success.light"
            valueColor="success.main"
          />
        </Grid>
      </Grid>

      {/* Filters Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par N° engagement, employé, CIN, réf..."
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

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              value={selectedEmployeId}
              onChange={(e) => {
                setSelectedEmployeId(e.target.value);
                setPage(0);
              }}
              label="Employé"
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">Tous les employés</MenuItem>
              {employesList.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.nom} {e.prenom} ({e.matricule})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Période (AAAA-MM)"
              value={selectedPeriode}
              onChange={(e) => {
                setSelectedPeriode(e.target.value);
                setPage(0);
              }}
              placeholder="2026-07"
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={1.75}>
            <TextField
              select
              value={selectedStatut}
              onChange={(e) => {
                setSelectedStatut(e.target.value);
                setPage(0);
              }}
              label="Statut"
              fullWidth
              size="small"
            >
              {STATUT_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.75}>
            <TextField
              select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                setPage(0);
              }}
              label="Mode règlement"
              fullWidth
              size="small"
            >
              {MODES_PAIEMENT.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading Bar */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des paiements.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Data Grid Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>N° Engagement</TableCell>
              <TableCell>Employé</TableCell>
              <TableCell>Matricule</TableCell>
              <TableCell>Période</TableCell>
              <TableCell align="right">Sal. Référence</TableCell>
              <TableCell align="right">Montant dû</TableCell>
              <TableCell align="right">Montant payé</TableCell>
              <TableCell align="right">Solde restant</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Dernier versement</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paiements.length > 0 ? (
              paiements.map((p: PaiementEmployeView) => {
                const statutInfo = STATUT_CONFIG[p.statut] || { label: p.statut, color: 'default' };
                const empName = p.employe ? `${p.employe.nom} ${p.employe.prenom}` : `Employé #${p.idEmploye}`;

                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                        {p.numeroPaiement}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {empName}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.employe?.matricule || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatPeriodeFr(p.periode)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {p.salaireReference.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {p.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        {p.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={p.soldeRestant > 0 ? 'warning.main' : 'text.primary'}
                      >
                        {p.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statutInfo.label} color={statutInfo.color} size="small" />
                    </TableCell>
                    <TableCell>{p.latestVersementDate || '—'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Can module="paiements_employes" action="ajouter">
                          {p.soldeRestant > 0 && (
                            <Tooltip title="Ajouter un versement">
                              <IconButton size="small" color="primary" onClick={() => setAddVersementTarget(p)}>
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Can>

                        <Can module="paiements_employes" action="modifier">
                          {p.versements.length === 0 && (
                            <Tooltip title="Modifier l’engagement (Brouillon)">
                              <IconButton size="small" color="warning" onClick={() => setEditTarget(p)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Can>

                        <Tooltip title="Consulter l’engagement">
                          <IconButton size="small" color="info" onClick={() => setDetailPaymentId(p.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="paiements_employes" action="supprimer">
                          {p.versements.length === 0 && (
                            <Tooltip title="Supprimer l’engagement (Brouillon)">
                              <IconButton size="small" color="error" onClick={() => setDeleteTarget(p)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Can>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
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
                          Aucun engagement ne correspond aux filtres et recherches sélectionnés.
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
                          Aucun engagement de paiement créé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Créez votre premier engagement de paiement salarié pour la période souhaitée.
                        </Typography>
                      </Box>
                      <Can module="paiements_employes" action="ajouter">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setIsCreateFormOpen(true)}
                        >
                          Nouvel engagement
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

      {/* Mobile Card List View */}
      <EmployeePaymentsMobileList
        paiements={paiements}
        onView={(p) => setDetailPaymentId(p.id)}
        onAddVersement={(p) => setAddVersementTarget(p)}
      />

      {/* Dialogs */}
      <EmployeePaymentFormDialog
        open={isCreateFormOpen || editTarget !== null}
        paiementToEdit={editTarget}
        onClose={() => {
          setIsCreateFormOpen(false);
          setEditTarget(null);
        }}
      />

      <EmployeePaymentDetailDialog
        open={detailPaymentId !== null}
        paymentId={detailPaymentId}
        onClose={() => setDetailPaymentId(null)}
      />

      <AddVersementDialog
        open={addVersementTarget !== null}
        paiement={addVersementTarget}
        onClose={() => setAddVersementTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer l’engagement de paiement"
        description={`Êtes-vous sûr de vouloir supprimer l’engagement brouillon "${deleteTarget?.numeroPaiement}" pour la période ${deleteTarget?.periode} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
