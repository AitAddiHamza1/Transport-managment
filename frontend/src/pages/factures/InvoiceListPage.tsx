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
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalculateIcon from '@mui/icons-material/Calculate';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useCreateFacture,
  useDeleteFacture,
  useDownloadFacturePdf,
  useFacturesQuery,
  useFactureStats,
  useUpdateFacture,
} from '../../features/factures/useFactures';
import { CreateFacturePayload, Facture } from '../../features/factures/types';
import { useClientsQuery } from '../../features/clients/useClients';
import { InvoiceMobileList } from './InvoiceMobileList';
import { InvoiceFormDialog } from './InvoiceFormDialog';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';

export function InvoiceListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formFacture, setFormFacture] = useState<Facture | null>(null);

  const [detailFactureId, setDetailFactureId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facture | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Lookups
  const { data: clientsData } = useClientsQuery({ page: 1, limit: 100 });
  const clientList = useMemo(() => clientsData?.data || [], [clientsData]);

  // Query params
  const queryParams = useMemo(() => {
    return {
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      nomClient: selectedClient !== 'ALL' ? selectedClient : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedClient]);

  // Queries & Mutations
  const { data: statsData } = useFactureStats();
  const { data, isLoading, isError, error } = useFacturesQuery(queryParams);

  const createMutation = useCreateFacture();
  const updateMutation = useUpdateFacture();
  const deleteMutation = useDeleteFacture();
  const downloadPdfMutation = useDownloadFacturePdf();

  const factures = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || (selectedClient && selectedClient !== 'ALL'),
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
    setSelectedClient('ALL');
    setPage(0);
  };

  // Handlers
  const handleOpenCreate = () => {
    setFormFacture(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (facture: Facture) => {
    setFormFacture(facture);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: CreateFacturePayload) => {
    if (formFacture) {
      await updateMutation.mutateAsync({ id: formFacture.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const getStatusChip = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return <Chip label="Payée" size="small" color="success" />;
      case 'PARTIELLEMENT_PAYEE':
        return <Chip label="Partiellement payée" size="small" color="warning" />;
      case 'EN_RETARD':
        return <Chip label="En retard" size="small" color="error" />;
      case 'ANNULEE':
        return <Chip label="Annulée" size="small" color="default" />;
      default:
        return <Chip label="Émise" size="small" color="info" />;
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Facturation & Factures Clients"
        subtitle="Gestion des factures émises, montants HT/TVA/TTC et échéances de paiement"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Factures', to: '/factures' },
          { label: 'Liste' },
        ]}
        action={
          <Can module="factures" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouvelle facture
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
                  <Typography variant="caption" color="text.secondary">Total factures</Typography>
                  <Typography variant="h4" fontWeight={700}>{statsData?.totalFactures ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <ReceiptIcon />
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
                  <Typography variant="caption" color="text.secondary">Sous-total HT (MAD)</Typography>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {(statsData?.totalSousTotal ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <CalculateIcon />
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
                  <Typography variant="caption" color="text.secondary">Total TVA (MAD)</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {(statsData?.totalTva ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <AccountBalanceWalletIcon />
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
                  <Typography variant="caption" color="text.secondary">Total TTC (MAD)</Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {(statsData?.totalTtc ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <AttachMoneyIcon />
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
              placeholder="Rechercher par numéro de facture, client, notes..."
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
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setPage(0);
              }}
              label="Filtrer par client"
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="ALL">Tous les clients</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.nomEntreprise}>
                  {c.nomEntreprise}
                </option>
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
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des factures.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Numéro & Date</TableCell>
              <TableCell>Client facturé</TableCell>
              <TableCell>Voyage lié</TableCell>
              <TableCell>Sous-total HT</TableCell>
              <TableCell>TVA</TableCell>
              <TableCell>Montant Total TTC</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {factures.length > 0 ? (
              factures.map((facture) => (
                <TableRow key={facture.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {facture.numeroFacture}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {facture.dateFacture}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {facture.nomClient}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {facture.voyage ? (
                      <Typography variant="caption" color="text.secondary">
                        Voyage #{facture.voyage.idVoyage} ({facture.voyage.lieuChargement} ➔ {facture.voyage.lieuDechargement})
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{(Number(facture.sousTotal) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</TableCell>
                  <TableCell>{(Number(facture.montantTva) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD ({facture.tauxTva}%)</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {(Number(facture.montantTotal) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(facture.statut)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Consulter la facture">
                        <IconButton size="small" color="info" onClick={() => setDetailFactureId(facture.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Télécharger la facture PDF">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={downloadPdfMutation.isPending}
                          onClick={() => downloadPdfMutation.mutate({ id: facture.id, numeroFacture: facture.numeroFacture })}
                        >
                          <PictureAsPdfIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Can module="factures" action="modifier">
                        <Tooltip title="Modifier">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(facture)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Can>

                      <Can module="factures" action="supprimer">
                        <Tooltip title="Annuler la facture">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(facture)}>
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
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  {hasActiveFilters ? (
                    <Stack spacing={2} alignItems="center" justifyContent="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                        <SearchIcon fontSize="large" />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600}>
                          Aucun résultat trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Aucune facture ne correspond aux critères sélectionnés.
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
                        <ReceiptIcon fontSize="large" />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600}>
                          Aucune facture enregistrée
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Créez votre première facture pour commencer le suivi de facturation client.
                        </Typography>
                      </Box>
                      <Can module="factures" action="ajouter">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Nouvelle facture
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
      <InvoiceMobileList
        factures={factures}
        onView={(facture) => setDetailFactureId(facture.id)}
        onEdit={handleOpenEdit}
        onDelete={(facture) => setDeleteTarget(facture)}
        onDownloadPdf={(facture) =>
          downloadPdfMutation.mutate({ id: facture.id, numeroFacture: facture.numeroFacture })
        }
      />

      {/* Dialogs */}
      <InvoiceFormDialog
        open={isFormOpen}
        facture={formFacture}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <InvoiceDetailDialog
        open={detailFactureId !== null}
        factureId={detailFactureId}
        onClose={() => setDetailFactureId(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Annuler la facture"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir annuler la facture ${deleteTarget.numeroFacture} (${deleteTarget.nomClient} - ${deleteTarget.montantTotal} MAD) ? Cette action effectuera une annulation sécurisée (soft delete).`
            : ''
        }
        confirmLabel="Annuler la facture"
        cancelLabel="Fermer"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
