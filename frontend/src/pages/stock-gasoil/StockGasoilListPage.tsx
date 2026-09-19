import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import OpacityIcon from '@mui/icons-material/Opacity';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CalculateIcon from '@mui/icons-material/Calculate';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useState, useEffect, useMemo } from 'react';
import {
  AppPagination,
  Can,
  ConfirmDialog,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';
import {
  useCreateStockEntree,
  useDeleteStockEntree,
  useStockGasoilMovements,
  useStockGasoilStats,
  useUpdateStockEntree,
} from '../../features/stock-gasoil/useStockGasoil';
import {
  CreateStockEntreePayload,
  PeriodPresetStock,
  StockGasoilMovementView,
  TypeMouvementGasoil,
} from '../../features/stock-gasoil/types';
import { StockEntreeFormDialog } from './StockEntreeFormDialog';
import { StockGasoilMobileList } from './StockGasoilMobileList';

export function StockGasoilListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [preset, setPreset] = useState<string>('CE_MOIS');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMovement, setFormMovement] = useState<StockGasoilMovementView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockGasoilMovementView | null>(null);

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
      typeMouvement: typeFilter !== 'ALL' ? (typeFilter as TypeMouvementGasoil) : undefined,
      preset: preset !== 'ALL' ? (preset as PeriodPresetStock) : undefined,
      dateFrom: preset === 'PERSONNALISE' && dateFrom ? dateFrom : undefined,
      dateTo: preset === 'PERSONNALISE' && dateTo ? dateTo : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, typeFilter, preset, dateFrom, dateTo]);

  // React Query hooks
  const { data: statsData } = useStockGasoilStats(queryParams);
  const { data, isLoading, isError, error } = useStockGasoilMovements(queryParams);

  const createMutation = useCreateStockEntree();
  const updateMutation = useUpdateStockEntree();
  const deleteMutation = useDeleteStockEntree();

  const movements = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (typeFilter && typeFilter !== 'ALL') || (preset && preset !== 'ALL'),
  );

  // Auto page correction
  useEffect(() => {
    if (meta.totalPages > 0 && page >= meta.totalPages) {
      setPage(Math.max(0, meta.totalPages - 1));
    }
  }, [meta.totalPages, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setTypeFilter('ALL');
    setPreset('CE_MOIS');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const handleOpenCreate = () => {
    setFormMovement(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: StockGasoilMovementView) => {
    setFormMovement(m);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: CreateStockEntreePayload) => {
    if (formMovement) {
      await updateMutation.mutateAsync({ id: formMovement.idMouvement, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.idMouvement);
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Gestion du stock gasoil"
        subtitle="Suivi des entrées, sorties et du stock actuel de gasoil."
        hideBreadcrumbs
        action={
          <Can module="stock_gasoil" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouvelle entrée
            </Button>
          </Can>
        }
      />

      {/* Stock alert banner */}
      {statsData?.statutAlerte === 'LOW' && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Stock gasoil faible</AlertTitle>
          {Number(statsData.stockActuelLitres).toLocaleString('fr-FR')} L disponibles — Seuil d'alerte : {Number(statsData.seuilAlerteLitres).toLocaleString('fr-FR')} L
        </Alert>
      )}

      {statsData?.statutAlerte === 'ZERO' && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon />}
          sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Stock gasoil épuisé</AlertTitle>
          Aucun litre disponible. Veuillez approvisionner la citerne de l'entreprise.
        </Alert>
      )}

      {/* 4 Authoritative Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Stock actuel"
          value={statsData?.stockActuelLitres ? `${Number(statsData.stockActuelLitres).toLocaleString('fr-FR')} L` : '0 L'}
          icon={<OpacityIcon />}
          iconBgColor={statsData?.statutAlerte === 'ZERO' ? 'error.light' : statsData?.statutAlerte === 'LOW' ? 'warning.light' : 'primary.light'}
          valueColor={statsData?.statutAlerte === 'ZERO' ? 'error.main' : statsData?.statutAlerte === 'LOW' ? 'warning.main' : 'primary.main'}
        />

        <StatCard
          label="Total entrées"
          value={statsData?.totalEntreesLitres ? `${Number(statsData.totalEntreesLitres).toLocaleString('fr-FR')} L` : '0 L'}
          icon={<ArrowDownwardIcon />}
          iconBgColor="success.light"
          valueColor="success.main"
        />

        <StatCard
          label="Total sorties"
          value={statsData?.totalSortiesLitres ? `${Number(statsData.totalSortiesLitres).toLocaleString('fr-FR')} L` : '0 L'}
          icon={<ArrowUpwardIcon />}
          iconBgColor="info.light"
          valueColor="info.main"
        />

        <StatCard
          label="PMP actuel"
          value={
            statsData?.pmpActuel
              ? `${Number(statsData.pmpActuel).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MAD/L`
              : '0,000 MAD/L'
          }
          icon={<CalculateIcon />}
          iconBgColor="secondary.light"
          valueColor="secondary.main"
        />
      </Box>

      {/* Filters Toolbar */}
      <Box sx={{ mb: 2 }}>
        <ListToolbar
          searchField={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Rechercher N° Bon, fournisseur, immat..."
            />
          }
          onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
        >
          <TextField
            select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            label="Type de mouvement"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 160 }}
          >
            <option value="ALL">Tous les mouvements</option>
            <option value="ENTREE">Entrées uniquement</option>
            <option value="SORTIE">Sorties uniquement</option>
          </TextField>

          <TextField
            select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setPage(0);
            }}
            label="Période"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 160 }}
          >
            <option value="ALL">Toutes les périodes</option>
            <option value="AUJOURDHUI">Aujourd’hui</option>
            <option value="CE_MOIS">Ce mois</option>
            <option value="CE_TRIMESTRE">Ce trimestre</option>
            <option value="CETTE_ANNEE">Cette année</option>
            <option value="PERSONNALISE">Personnalisé</option>
          </TextField>

          {preset === 'PERSONNALISE' && (
            <>
              <TextField
                type="date"
                label="Date de début"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 140 }}
              />
              <TextField
                type="date"
                label="Date de fin"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 140 }}
              />
            </>
          )}
        </ListToolbar>
      </Box>

      {/* Loading Progress */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Impossible de charger le stock gasoil.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop 10-Column Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell density="dense">
          <Table sx={{ minWidth: 1100 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Quantité (L)</TableCell>
                <TableCell align="right">Prix unitaire</TableCell>
                <TableCell align="right">Montant Total</TableCell>
                <TableCell>Fournisseur / Bon</TableCell>
                <TableCell>Véhicule</TableCell>
                <TableCell>Conducteur</TableCell>
                <TableCell align="right">Stock après</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.length > 0 ? (
                movements.map((m) => {
                  const isEntree = m.typeMouvement === 'ENTREE';

                  return (
                    <TableRow key={m.idMouvement} hover>
                      <TableCell>
                        <Typography variant="body2">{m.dateMouvement.split('T')[0]}</Typography>
                      </TableCell>

                      <TableCell>
                        <StatusChip
                          label={isEntree ? 'ENTRÉE' : 'SORTIE'}
                          variant={isEntree ? 'success' : 'info'}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Chip
                          label={`${isEntree ? '+' : '-'}${Number(m.quantiteLitres).toLocaleString('fr-FR')} L`}
                          size="small"
                          color={isEntree ? 'success' : 'info'}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        {m.prixUnitaire
                          ? `${Number(m.prixUnitaire).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MAD/L`
                          : '—'}
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color={isEntree ? 'success.main' : 'info.main'}>
                          {m.montantTotal
                            ? `${Number(m.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`
                            : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {isEntree ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {m.nomFournisseur || '—'}
                            </Typography>
                            {m.referenceFacture && (
                              <Typography variant="caption" color="text.secondary">
                                Réf: {m.referenceFacture}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                              {m.numeroBon ? `Bon #${m.numeroBon}` : `Bon #${m.idBonCarburant}`}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {m.immatriculation || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{m.nomConducteur || '—'}</Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {Number(m.stockApresMouvement).toLocaleString('fr-FR')} L
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {isEntree ? (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Can module="stock_gasoil" action="modifier">
                              <Tooltip title="Modifier">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(m)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Can>
                            <Can module="stock_gasoil" action="supprimer">
                              <Tooltip title="Supprimer">
                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(m)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Can>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Bon interne
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
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
                            Aucun mouvement de stock ne correspond aux filtres sélectionnés.
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
                          <LocalGasStationIcon fontSize="large" />
                        </Avatar>
                        <Box text-align="center">
                          <Typography variant="h6" fontWeight={600}>
                            Aucun mouvement de stock
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Effectuez une première entrée de stock pour approvisionner la citerne de l’entreprise.
                          </Typography>
                        </Box>
                        <Can module="stock_gasoil" action="ajouter">
                          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                            Nouvelle entrée
                          </Button>
                        </Can>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
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

      {/* Mobile Card List View */}
      <StockGasoilMobileList
        movements={movements}
        onEdit={handleOpenEdit}
        onDelete={(m) => setDeleteTarget(m)}
      />

      {/* Dialogs */}
      <StockEntreeFormDialog
        open={isFormOpen}
        movement={formMovement}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer cette entrée de stock ?"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer l'entrée de stock #${deleteTarget.idMouvement} (${deleteTarget.quantiteLitres} L @ ${deleteTarget.prixUnitaire} MAD/L) ?`
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
