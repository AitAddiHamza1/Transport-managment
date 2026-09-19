import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import {
  AppPagination,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  ADMINISTRATIVE_EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  ChargeAdministrative,
} from '../../features/charges-administratives/types';
import { chargesAdministrativesApi } from '../../features/charges-administratives/chargesAdministrativesApi';
import {
  useChargesAdministrativesQuery,
  useChargeAdministrativeStatsQuery,
  useCreateChargeAdministrativeMutation,
  useUpdateChargeAdministrativeMutation,
  useUploadReceiptMutation,
  useDeleteReceiptMutation,
  useDeleteChargeAdministrativeMutation,
} from '../../features/charges-administratives/useChargesAdministratives';
import { notify } from '../../utils/notify';
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

  const handleDownloadReceipt = async (id: number) => {
    try {
      await chargesAdministrativesApi.downloadReceiptFile(id);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du justificatif');
    }
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
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Charges administratives"
        subtitle="Gestion des dépenses de fonctionnement et frais généraux de l'entreprise"
        hideBreadcrumbs
        action={
          <Can module="depenses_administratives" action="ajouter">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Nombre de dépenses"
          value={statsData?.totalCount || 0}
          icon={<ReceiptLongIcon />}
          iconBgColor="primary.light"
          loading={isLoadingStats}
        />

        <StatCard
          label="Montant total (MAD)"
          value={`${formattedMontantTotal} MAD`}
          icon={<AccountBalanceWalletIcon />}
          iconBgColor="success.light"
          valueColor="primary.main"
          loading={isLoadingStats}
        />

        <StatCard
          label="Montant moyen (MAD)"
          value={`${formattedMontantMoyen} MAD`}
          icon={<AnalyticsIcon />}
          iconBgColor="info.light"
          valueColor="info.main"
          loading={isLoadingStats}
        />

        <StatCard
          label="Avec justificatif"
          value={`${statsData?.withReceiptCount || 0} (${statsData?.withReceiptPercentage || 0}%)`}
          icon={<TaskAltIcon />}
          iconBgColor="secondary.light"
          loading={isLoadingStats}
        />
      </Box>

      {/* Filter Toolbar */}
      <Box sx={{ mb: 2 }}>
        <ListToolbar
          searchField={
            <SearchField
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Rechercher par catégorie ou description..."
            />
          }
          onResetFilters={
            search || categorieDepense || dateDebut || dateFin || hasReceipt !== 'all'
              ? handleResetFilters
              : undefined
          }
        >
          <TextField
            select
            size="small"
            label="Catégorie"
            value={categorieDepense}
            onChange={(e) => {
              setCategorieDepense(e.target.value);
              setPage(1);
            }}
            SelectProps={{ native: true }}
            sx={{ minWidth: 170 }}
          >
            <option value="">Toutes les catégories</option>
            {ADMINISTRATIVE_EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </TextField>

          <TextField
            size="small"
            type="date"
            label="Du"
            InputLabelProps={{ shrink: true }}
            value={dateDebut}
            onChange={(e) => {
              setDateDebut(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 130 }}
          />

          <TextField
            size="small"
            type="date"
            label="Au"
            InputLabelProps={{ shrink: true }}
            value={dateFin}
            onChange={(e) => {
              setDateFin(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 130 }}
          />

          <TextField
            select
            size="small"
            label="Justificatif"
            value={hasReceipt}
            onChange={(e) => {
              setHasReceipt(e.target.value);
              setPage(1);
            }}
            SelectProps={{ native: true }}
            sx={{ minWidth: 130 }}
          >
            <option value="all">Tous</option>
            <option value="true">Avec reçu</option>
            <option value="false">Sans reçu</option>
          </TextField>
        </ListToolbar>
      </Box>

      {/* Desktop Data Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell density="dense">
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>N° / Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Catégorie</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Montant (MAD)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Justificatif</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Créé par</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingList ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton height={24} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="error">
                      Erreur lors du chargement des charges administratives.
                    </Typography>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => refetch()}>
                      Réessayer
                    </Button>
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      Aucune charge administrative trouvée.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp: ChargeAdministrative) => {
                  const numMontant = parseFloat(exp.montant);
                  const formattedMontant = !isNaN(numMontant)
                    ? numMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : exp.montant;

                  return (
                    <TableRow key={exp.idDepense} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary.main">
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
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {formattedMontant} MAD
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {exp.hasReceipt ? (
                          <Tooltip title="Télécharger le justificatif">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleDownloadReceipt(exp.idDepense)}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <StatusChip label="Non" variant="default" size="small" />
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {exp.auteur ? exp.auteur.nom : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Consulter le détail">
                            <IconButton size="small" onClick={() => handleOpenDetail(exp)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Can module="depenses_administratives" action="modifier">
                            <Tooltip title="Modifier">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(exp)}>
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
                })
              )}
            </TableBody>
          </Table>
          <AppPagination
            page={page}
            pageSize={limit}
            totalCount={meta.total}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(ps) => {
              setLimit(ps);
              setPage(1);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </DataTableShell>
      </Box>

      {/* Mobile Card List View */}
      <AdministrativeExpenseMobileList
        expenses={expenses}
        onView={handleOpenDetail}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

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

