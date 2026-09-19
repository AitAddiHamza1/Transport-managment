import {
  Avatar,
  Box,
  Button,
  Chip,
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
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HandymanIcon from '@mui/icons-material/Handyman';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useEffect, useMemo } from 'react';

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
  useChargesVehiculesQuery,
  useChargeVehiculeStats,
  useCreateChargeVehicule,
  useDeleteChargeVehicule,
  useUpdateChargeVehicule,
} from '../../features/charges-vehicules/useChargesVehicules';
import { ChargeVehicule } from '../../features/charges-vehicules/types';
import { chargesVehiculesApi } from '../../features/charges-vehicules/chargesVehiculesApi';
import { notify } from '../../utils/notify';
import { VehicleExpenseMobileList } from './VehicleExpenseMobileList';
import { VehicleExpenseFormDialog } from './VehicleExpenseFormDialog';
import { VehicleExpenseDetailDialog } from './VehicleExpenseDetailDialog';

const expenseCategories = [
  'ALL',
  'ENTRETIEN',
  'REPARATION',
  'ASSURANCE',
  'TAXE',
  'PEAGE',
  'PNEUS',
  'PIECES',
  'LAVAGE',
  'CONTROLE_TECHNIQUE',
  'AUTRE',
];

export function VehicleExpenseListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formExpense, setFormExpense] = useState<ChargeVehicule | null>(null);

  const [detailExpenseId, setDetailExpenseId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ChargeVehicule | null>(null);

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
      categorieDepense: selectedCategorie !== 'ALL' ? selectedCategorie : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedCategorie]);

  // Queries & Mutations
  const { data: statsData, isLoading: isLoadingStats } = useChargeVehiculeStats();
  const { data, isLoading, isError, error, refetch } = useChargesVehiculesQuery(queryParams);

  const createMutation = useCreateChargeVehicule();
  const updateMutation = useUpdateChargeVehicule();
  const deleteMutation = useDeleteChargeVehicule();

  const expenses = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (selectedCategorie && selectedCategorie !== 'ALL'),
  );

  // Page auto-correction on row deletion
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  // Reset filters handler
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategorie('ALL');
    setPage(0);
  };

  // Handlers
  const handleOpenCreate = () => {
    setFormExpense(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (exp: ChargeVehicule) => {
    setFormExpense(exp);
    setIsFormOpen(true);
  };

  const handleDownloadReceipt = async (id: number) => {
    try {
      await chargesVehiculesApi.downloadReceiptFile(id);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du reçu');
    }
  };

  const handleFormSubmit = async ({ payload, file }: { payload: any; file?: File }) => {
    if (formExpense) {
      await updateMutation.mutateAsync({ id: formExpense.idDepense, payload, file });
    } else {
      await createMutation.mutateAsync({ payload, file });
    }
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.idDepense);
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Gestion des charges véhicules"
        subtitle="Suivi financier, entretiens, réparations et dépenses opérationnelles de la flotte"
        hideBreadcrumbs
        action={
          <Can module="depenses_vehicules" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouvelle charge
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Total charges"
          value={statsData?.totalCount ?? 0}
          icon={<ReceiptLongIcon />}
          iconBgColor="primary.light"
          loading={isLoadingStats}
        />

        <StatCard
          label="Montant total (MAD)"
          value={(statsData?.totalMontant ?? 0).toLocaleString('fr-FR')}
          icon={<AttachMoneyIcon />}
          iconBgColor="success.light"
          valueColor="primary.main"
          loading={isLoadingStats}
        />

        <StatCard
          label="Entretiens & Réparations"
          value={((statsData?.entretienMontant ?? 0) + (statsData?.reparationsMontant ?? 0)).toLocaleString('fr-FR')}
          icon={<HandymanIcon />}
          iconBgColor="warning.light"
          valueColor="warning.main"
          loading={isLoadingStats}
        />

        <StatCard
          label="Autres dépenses"
          value={(statsData?.autresMontant ?? 0).toLocaleString('fr-FR')}
          icon={<LocalShippingIcon />}
          iconBgColor="info.light"
          valueColor="info.main"
          loading={isLoadingStats}
        />
      </Box>

      {/* Filters Toolbar */}
      <Box sx={{ mb: 2 }}>
        <ListToolbar
          searchField={
            <SearchField
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Rechercher par catégorie, immatriculation, description, n° facture..."
            />
          }
          onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
        >
          <TextField
            select
            value={selectedCategorie}
            onChange={(e) => {
              setSelectedCategorie(e.target.value);
              setPage(0);
            }}
            label="Catégorie de dépense"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 200 }}
          >
            <option value="ALL">Toutes les catégories</option>
            {expenseCategories.filter((c) => c !== 'ALL').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </TextField>
        </ListToolbar>
      </Box>

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell density="dense">
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>N° & Catégorie</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Véhicule immatriculé</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Justificatif</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>N° Facture / Réf</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Montant</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton height={24} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="error">
                      {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des charges véhicules.'}
                    </Typography>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => refetch()}>
                      Réessayer
                    </Button>
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
                            Aucune charge ne correspond aux critères sélectionnés.
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
                          <BuildIcon fontSize="large" />
                        </Avatar>
                        <Box text-align="center">
                          <Typography variant="h6" fontWeight={600}>
                            Aucune charge véhicule enregistrée
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Ajoutez votre première dépense pour commencer le suivi des coûts.
                          </Typography>
                        </Box>
                        <Can module="depenses_vehicules" action="ajouter">
                          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                            Nouvelle charge
                          </Button>
                        </Can>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.idDepense} hover>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                          #{exp.idDepense}
                        </Typography>
                        {exp.hasReceipt && (
                          <Tooltip title="Télécharger le reçu / la facture">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleDownloadReceipt(exp.idDepense)}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                      <Chip label={exp.categorieDepense} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {exp.immatriculation}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip
                        label={exp.justificatifType === 'AVEC_FACTURE' ? 'Avec facture' : 'Sans facture'}
                        variant={exp.justificatifType === 'AVEC_FACTURE' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{exp.typeFacture || '—'}</TableCell>
                    <TableCell>{exp.description || '—'}</TableCell>
                    <TableCell>{exp.dateDepense}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {exp.montant.toLocaleString('fr-FR')} MAD
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Consulter la fiche">
                          <IconButton size="small" onClick={() => setDetailExpenseId(exp.idDepense)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Can module="depenses_vehicules" action="modifier">
                          <Tooltip title="Modifier">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(exp)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>

                        <Can module="depenses_vehicules" action="supprimer">
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(exp)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Can>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <AppPagination
            page={page + 1}
            pageSize={rowsPerPage}
            totalCount={meta.total}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(ps) => {
              setRowsPerPage(ps);
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </DataTableShell>
      </Box>

      {/* Mobile Card List */}
      <VehicleExpenseMobileList
        expenses={expenses}
        onView={(exp) => setDetailExpenseId(exp.idDepense)}
        onEdit={handleOpenEdit}
        onDelete={(exp) => setDeleteTarget(exp)}
      />

      {/* Dialogs */}
      <VehicleExpenseFormDialog
        open={isFormOpen}
        expense={formExpense}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <VehicleExpenseDetailDialog
        open={detailExpenseId !== null}
        expenseId={detailExpenseId}
        onClose={() => setDetailExpenseId(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer la dépense véhicule"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer la dépense #${deleteTarget.idDepense} (${deleteTarget.categorieDepense} - ${deleteTarget.immatriculation} - ${deleteTarget.montant} MAD) ?`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

