import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HandymanIcon from '@mui/icons-material/Handyman';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
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
  const { data: statsData } = useChargeVehiculeStats();
  const { data, isLoading, isError, error } = useChargesVehiculesQuery(queryParams);

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
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Charges véhicules', to: '/charges-vehicules' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="depenses_vehicules" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouvelle charge
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total charges</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.totalCount ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <ReceiptLongIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Montant total (MAD)</Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {(statsData?.totalMontant ?? 0).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <AttachMoneyIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Entretiens & Réparations</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {((statsData?.entretienMontant ?? 0) + (statsData?.reparationsMontant ?? 0)).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <HandymanIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Autres dépenses</Typography>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {(statsData?.autresMontant ?? 0).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <BuildIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par catégorie, immatriculation, description, n° facture..."
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
              value={selectedCategorie}
              onChange={(e) => {
                setSelectedCategorie(e.target.value);
                setPage(0);
              }}
              label="Catégorie de dépense"
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">Toutes les catégories</MenuItem>
              {expenseCategories.filter((c) => c !== 'ALL').map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des charges véhicules.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Dépense & Catégorie</TableCell>
              <TableCell>Véhicule immatriculé</TableCell>
              <TableCell>N° Facture / Réf</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Montant</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.length > 0 ? (
              expenses.map((exp) => (
                <TableRow key={exp.idDepense} hover>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="subtitle2" fontWeight={700}>
                        #{exp.idDepense}
                      </Typography>
                      {exp.hasReceipt && (
                        <Tooltip title="Facture / Reçu joint">
                          <AttachFileIcon fontSize="small" color="primary" />
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
                  <TableCell>{exp.typeFacture || '—'}</TableCell>
                  <TableCell>{exp.description || '—'}</TableCell>
                  <TableCell>{exp.dateDepense}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {exp.montant.toLocaleString('fr-FR')} MAD
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Consulter la fiche">
                        <IconButton size="small" color="info" onClick={() => setDetailExpenseId(exp.idDepense)}>
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
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  {hasActiveFilters ? (
                    /* Inline Empty State: Filters/Search active */
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
                    /* Inline Empty State: No expenses exist */
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
