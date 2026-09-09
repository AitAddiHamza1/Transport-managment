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
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import { PageHeader, StatCard } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  ADMINISTRATIVE_EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  ChargeAdministrative,
} from '../../features/charges-administratives/types';
import {
  useChargesAdministrativesQuery,
  useChargeAdministrativeStatsQuery,
  useCreateChargeAdministrativeMutation,
  useUpdateChargeAdministrativeMutation,
  useUploadReceiptMutation,
  useDeleteReceiptMutation,
  useDeleteChargeAdministrativeMutation,
} from '../../features/charges-administratives/useChargesAdministratives';
import { AdministrativeExpenseFormDialog } from './AdministrativeExpenseFormDialog';
import { AdministrativeExpenseDetailDialog } from './AdministrativeExpenseDetailDialog';
import { AdministrativeExpenseMobileList } from './AdministrativeExpenseMobileList';

export function AdministrativeExpenseListPage() {
  // Query Filters State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [categorieDepense, setCategorieDepense] = useState<string>('');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [hasReceipt, setHasReceipt] = useState<string>('all');

  // Debounce search input
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
    categorieDepense: categorieDepense || undefined,
    dateDebut: dateDebut || undefined,
    dateFin: dateFin || undefined,
    hasReceipt: hasReceipt !== 'all' ? hasReceipt : undefined,
  };

  // Queries
  const { data: listData, isLoading: isLoadingList, isError, refetch } = useChargesAdministrativesQuery(queryParams);
  const { data: statsData, isLoading: isLoadingStats } = useChargeAdministrativeStatsQuery(queryParams);

  // Mutations
  const createMutation = useCreateChargeAdministrativeMutation();
  const updateMutation = useUpdateChargeAdministrativeMutation();
  const uploadReceiptMutation = useUploadReceiptMutation();
  const deleteReceiptMutation = useDeleteReceiptMutation();
  const deleteMutation = useDeleteChargeAdministrativeMutation();

  // Dialog States
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<ChargeAdministrative | null>(null);

  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<ChargeAdministrative | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedExpenseForDelete, setSelectedExpenseForDelete] = useState<ChargeAdministrative | null>(null);

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const expenses = listData?.data || [];
  const meta = listData?.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Page auto-correction if list becomes empty on higher page
  useEffect(() => {
    if (meta.totalPages > 0 && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta.totalPages, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategorieDepense('');
    setDateDebut('');
    setDateFin('');
    setHasReceipt('all');
    setPage(1);
  };

  const handleOpenCreate = () => {
    setSelectedExpenseForEdit(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (expense: ChargeAdministrative) => {
    setSelectedExpenseForEdit(expense);
    setFormDialogOpen(true);
  };

  const handleOpenDetail = (expense: ChargeAdministrative) => {
    setSelectedExpenseForDetail(expense);
    setDetailDialogOpen(true);
  };

  const handleOpenDelete = (expense: ChargeAdministrative) => {
    setSelectedExpenseForDelete(expense);
    setDeleteConfirmOpen(true);
  };

  const handleFormSubmit = async (payload: any) => {
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    if (selectedExpenseForEdit) {
      await updateMutation.mutateAsync({
        id: selectedExpenseForEdit.idDepense,
        payload: {
          categorieDepense: payload.categorieDepense,
          description: payload.description,
          montant: payload.montant,
          dateDepense: payload.dateDepense,
        },
      });
      setActionSuccessMessage(`Charge administrative #${selectedExpenseForEdit.idDepense} modifiée avec succès.`);
    } else {
      await createMutation.mutateAsync(payload);
      setActionSuccessMessage('Nouvelle charge administrative enregistrée avec succès.');
    }
    setFormDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedExpenseForDelete) return;
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(selectedExpenseForDelete.idDepense);
      setActionSuccessMessage(`Charge administrative #${selectedExpenseForDelete.idDepense} supprimée avec succès.`);
    } catch (err: any) {
      setActionErrorMessage(err.response?.data?.message || 'Erreur lors de la suppression de la charge.');
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedExpenseForDelete(null);
    }
  };

  const numMontantTotal = parseFloat(statsData?.montantTotal || '0');
  const formattedMontantTotal = !isNaN(numMontantTotal)
    ? numMontantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const numMontantMoyen = parseFloat(statsData?.montantMoyen || '0');
  const formattedMontantMoyen = !isNaN(numMontantMoyen)
    ? numMontantMoyen.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Charges administratives"
        subtitle="Gestion des dépenses de fonctionnement et frais généraux de l'entreprise"
        breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Charges administratives' }]}
        action={
          <Can module="depenses_administratives" action="ajouter">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              size="large"
            >
              Nouvelle charge
            </Button>
          </Can>
        }
      />

      {actionSuccessMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setActionSuccessMessage(null)}>
          {actionSuccessMessage}
        </Alert>
      )}

      {actionErrorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionErrorMessage(null)}>
          {actionErrorMessage}
        </Alert>
      )}

      {/* 4 StatCards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Nombre de dépenses"
            value={isLoadingStats ? '...' : (statsData?.totalCount || 0).toString()}
            icon={<ReceiptLongIcon />}
            iconBgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Montant total (MAD)"
            value={isLoadingStats ? '...' : `${formattedMontantTotal} MAD`}
            icon={<AccountBalanceWalletIcon />}
            iconBgColor="success.light"
            valueColor="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Montant moyen (MAD)"
            value={isLoadingStats ? '...' : `${formattedMontantMoyen} MAD`}
            icon={<AnalyticsIcon />}
            iconBgColor="info.light"
            valueColor="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Avec justificatif"
            value={
              isLoadingStats
                ? '...'
                : `${statsData?.withReceiptCount || 0} (${statsData?.withReceiptPercentage || 0}%)`
            }
            icon={<TaskAltIcon />}
            iconBgColor="secondary.light"
          />
        </Grid>
      </Grid>

      {/* Search Toolbar & Filters */}
      <Card variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher par catégorie ou description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Catégorie"
              value={categorieDepense}
              onChange={(e) => {
                setCategorieDepense(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Toutes les catégories</MenuItem>
              {ADMINISTRATIVE_EXPENSE_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <TextField
              type="date"
              fullWidth
              size="small"
              label="Du"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <TextField
              type="date"
              fullWidth
              size="small"
              label="Au"
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                fullWidth
                size="small"
                label="Justificatif"
                value={hasReceipt}
                onChange={(e) => {
                  setHasReceipt(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="true">Avec reçu</MenuItem>
                <MenuItem value="false">Sans reçu</MenuItem>
              </TextField>

              {(search || categorieDepense || dateDebut || dateFin || hasReceipt !== 'all') && (
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

      {/* Main Content Area: Loading / Error / Table / Mobile List */}
      {isLoadingList ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ my: 3 }} action={<Button color="inherit" onClick={() => refetch()}>Réessayer</Button>}>
          Erreur lors du chargement des charges administratives.
        </Alert>
      ) : expenses.length === 0 ? (
        <Card variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune charge administrative trouvée
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ajustez vos filtres de recherche ou enregistrez une nouvelle charge.
          </Typography>
          <Can module="depenses_administratives" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Créer une charge
            </Button>
          </Can>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>N° / Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Catégorie</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Montant (MAD)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Justificatif</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Créé par</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((exp) => {
                  const numMontant = parseFloat(exp.montant);
                  const formattedMontant = !isNaN(numMontant)
                    ? numMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : exp.montant;

                  return (
                    <TableRow key={exp.idDepense} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          #{exp.idDepense}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(exp.dateDepense).toLocaleDateString('fr-FR')}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={CATEGORY_LABELS[exp.categorieDepense as keyof typeof CATEGORY_LABELS] || exp.categorieDepense}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                          {exp.description || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {formattedMontant} MAD
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {exp.hasReceipt ? (
                          <Tooltip title="Justificatif joint disponible">
                            <Chip size="small" icon={<AttachFileIcon />} label="Oui" color="success" variant="outlined" />
                          </Tooltip>
                        ) : (
                          <Chip size="small" label="Non" color="default" variant="outlined" />
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {exp.auteur ? exp.auteur.nom : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Consulter le détail">
                            <IconButton size="small" color="primary" onClick={() => handleOpenDetail(exp)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Can module="depenses_administratives" action="modifier">
                            <Tooltip title="Modifier">
                              <IconButton size="small" color="info" onClick={() => handleOpenEdit(exp)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Can>

                          <Can module="depenses_administratives" action="supprimer">
                            <Tooltip title="Supprimer">
                              <IconButton size="small" color="error" onClick={() => handleOpenDelete(exp)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Can>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile Card View */}
          <AdministrativeExpenseMobileList
            expenses={expenses}
            onView={handleOpenDetail}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />

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
              labelRowsPerPage="Lignes par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </Box>
        </>
      )}

      {/* Form Dialog (Create & Edit) */}
      <AdministrativeExpenseFormDialog
        open={formDialogOpen}
        expense={selectedExpenseForEdit}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Detail View Dialog */}
      <AdministrativeExpenseDetailDialog
        open={detailDialogOpen}
        expense={selectedExpenseForDetail}
        onClose={() => setDetailDialogOpen(false)}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onUploadReceipt={async (id, file) => {
          await uploadReceiptMutation.mutateAsync({ id, file });
        }}
        onDeleteReceipt={async (id) => {
          await deleteReceiptMutation.mutateAsync(id);
        }}
        isUploadingReceipt={uploadReceiptMutation.isPending}
        isDeletingReceipt={deleteReceiptMutation.isPending}
      />

      {/* Soft Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Supprimer la charge administrative"
        description={
          selectedExpenseForDelete
            ? `Êtes-vous sûr de vouloir supprimer la charge administrative #${selectedExpenseForDelete.idDepense} (${selectedExpenseForDelete.categorieDepense} - ${selectedExpenseForDelete.montant} MAD) ? Cette action effectuera une suppression logique.`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
