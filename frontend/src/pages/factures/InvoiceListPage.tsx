import {
  Avatar,
  Box,
  Button,
  Grid,
  IconButton,
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
import { PdfStampDialog } from '../../components/factures/PdfStampDialog';

export function InvoiceListPage() {
  // Query state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [selectedDevise, setSelectedDevise] = useState<string>('ALL');
  const [selectedModeFacturation, setSelectedModeFacturation] = useState<string>('ALL');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formFacture, setFormFacture] = useState<Facture | null>(null);

  const [detailFactureId, setDetailFactureId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facture | null>(null);
  const [pdfStampTarget, setPdfStampTarget] = useState<Facture | null>(null);

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
      devise: selectedDevise !== 'ALL' ? selectedDevise : undefined,
      modeFacturation: selectedModeFacturation !== 'ALL' ? (selectedModeFacturation as 'AVEC_FACTURE' | 'SANS_FACTURE') : undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedClient, selectedDevise, selectedModeFacturation]);

  // Queries & Mutations
  const { data: statsData } = useFactureStats(selectedDevise !== 'ALL' ? { devise: selectedDevise } : undefined);
  const { data, isLoading, isError, error } = useFacturesQuery(queryParams);

  const createMutation = useCreateFacture();
  const updateMutation = useUpdateFacture();
  const deleteMutation = useDeleteFacture();
  const downloadPdfMutation = useDownloadFacturePdf();

  const factures = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      (selectedClient && selectedClient !== 'ALL') ||
      (selectedModeFacturation && selectedModeFacturation !== 'ALL') ||
      (selectedDevise && selectedDevise !== 'ALL'),
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
    setSelectedDevise('ALL');
    setSelectedModeFacturation('ALL');
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

  const renderStatusChip = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return <StatusChip variant="PAYEE" label="Payée" />;
      case 'PARTIELLEMENT_PAYEE':
        return <StatusChip variant="PARTIELLEMENT_PAYEE" label="Partiellement payée" />;
      case 'EN_RETARD':
        return <StatusChip variant="EN_RETARD" label="En retard" />;
      case 'ANNULEE':
        return <StatusChip variant="ANNULEE" label="Annulée" />;
      default:
        return <StatusChip variant="EMISE" label="Émise" />;
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Primary list page Header without breadcrumbs */}
      <PageHeader
        title="Facturation & Factures Clients"
        subtitle="Gestion des factures émises, montants HT/TVA/TTC et échéances de paiement"
        hideBreadcrumbs
        action={
          <Can module="factures" action="ajouter">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Nouvelle facture
            </Button>
          </Can>
        }
      />

      {/* Top Stat Cards (4 metrics, responsive grid) */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label="Total factures"
            value={statsData?.totalFactures ?? 0}
            icon={<ReceiptIcon />}
            iconBgColor="primary.light"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label={`Sous-total HT (${statsData?.devise === 'MIXED' ? 'multi-devises' : (statsData?.devise || 'MAD')})`}
            value={statsData?.devise === 'MIXED' ? '—' : (statsData?.totalSousTotal ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<CalculateIcon />}
            iconBgColor="info.light"
            valueColor="info.main"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label={`Total TVA (${statsData?.devise === 'MIXED' ? 'multi-devises' : (statsData?.devise || 'MAD')})`}
            value={statsData?.devise === 'MIXED' ? '—' : (statsData?.totalTva ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<AccountBalanceWalletIcon />}
            iconBgColor="warning.light"
            valueColor="warning.main"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            label={`Total TTC (${statsData?.devise === 'MIXED' ? 'multi-devises' : (statsData?.devise || 'MAD')})`}
            value={statsData?.devise === 'MIXED' ? '—' : (statsData?.totalTtc ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            icon={<AttachMoneyIcon />}
            iconBgColor="success.light"
            valueColor="primary.main"
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <ListToolbar
        searchField={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par numéro de facture, client, notes..."
          />
        }
        onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
        resetDisabled={!hasActiveFilters}
      >
        <TextField
          select
          value={selectedClient}
          onChange={(e) => {
            setSelectedClient(e.target.value);
            setPage(0);
          }}
          label="Filtrer par client"
          size="small"
          SelectProps={{ native: true }}
          sx={{ minWidth: 160 }}
        >
          <option value="ALL">Tous les clients</option>
          {clientList.map((c) => (
            <option key={c.id} value={c.nomEntreprise}>
              {c.nomEntreprise}
            </option>
          ))}
        </TextField>

        <TextField
          select
          value={selectedModeFacturation}
          onChange={(e) => {
            setSelectedModeFacturation(e.target.value);
            setPage(0);
          }}
          label="Mode de facturation"
          size="small"
          SelectProps={{ native: true }}
          sx={{ minWidth: 160 }}
        >
          <option value="ALL">Toutes (Tous les modes)</option>
          <option value="AVEC_FACTURE">Avec facture</option>
          <option value="SANS_FACTURE">Sans facture</option>
        </TextField>

        <TextField
          select
          value={selectedDevise}
          onChange={(e) => {
            setSelectedDevise(e.target.value);
            setPage(0);
          }}
          label="Devise"
          size="small"
          SelectProps={{ native: true }}
          sx={{ minWidth: 120 }}
        >
          <option value="ALL">Toutes devises</option>
          <option value="MAD">MAD (MAD)</option>
          <option value="EUR">EUR (EUR)</option>
        </TextField>
      </ListToolbar>

      {/* Error state */}
      {isError && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            {(error as any)?.response?.data?.message || 'Une erreur s’est produite lors du chargement des factures.'}
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell
          density="standard"
          loading={isLoading}
          pagination={
            <AppPagination
              page={page + 1}
              pageSize={rowsPerPage}
              totalCount={meta.total}
              onPageChange={(newPage) => setPage(newPage - 1)}
              onPageSizeChange={(newSize) => {
                setRowsPerPage(newSize);
                setPage(0);
              }}
            />
          }
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Numéro & Date</TableCell>
                <TableCell>Client facturé</TableCell>
                <TableCell>Voyage lié</TableCell>
                <TableCell>Sous-total HT</TableCell>
                <TableCell>TVA</TableCell>
                <TableCell>Montant Total TTC</TableCell>
                <TableCell>Montant payé</TableCell>
                <TableCell>Solde restant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {factures.length > 0 ? (
                factures.map((facture) => {
                  const currency = facture.devise || 'MAD';
                  return (
                    <TableRow key={facture.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {facture.numeroFacture}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {facture.dateFacture}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
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
                      <TableCell>{(Number(facture.sousTotal) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}</TableCell>
                      <TableCell>{(Number(facture.montantTva) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency} ({facture.tauxTva}%)</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {(Number(facture.montantTotal) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={Number(facture.montantPaye) > 0 ? 600 : 400}
                          color={Number(facture.montantPaye) > 0 ? 'success.main' : 'text.primary'}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {(Number(facture.montantPaye) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={Number(facture.soldeRestant) > 0 ? 'error.main' : 'success.main'}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {(Number(facture.soldeRestant) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                        </Typography>
                      </TableCell>
                      <TableCell>{renderStatusChip(facture.statut)}</TableCell>
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
                              onClick={() => {
                                setPdfStampTarget(facture);
                              }}
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
        </DataTableShell>
      </Box>

      {/* Mobile Card List */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <InvoiceMobileList
          factures={factures}
          onView={(facture) => setDetailFactureId(facture.id)}
          onEdit={handleOpenEdit}
          onDelete={(facture) => setDeleteTarget(facture)}
          onDownloadPdf={(facture) => setPdfStampTarget(facture)}
        />
      </Box>

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

      <PdfStampDialog
        open={pdfStampTarget !== null}
        invoiceNumber={pdfStampTarget?.numeroFacture || null}
        isLoading={downloadPdfMutation.isPending}
        error={downloadPdfMutation.error ? ((downloadPdfMutation.error as any).response?.data?.message || 'Erreur lors du téléchargement') : null}
        onClose={() => {
          setPdfStampTarget(null);
          downloadPdfMutation.reset();
        }}
        onDownload={async (includeStamp) => {
          if (pdfStampTarget) {
            try {
              await downloadPdfMutation.mutateAsync({
                id: pdfStampTarget.id,
                numeroFacture: pdfStampTarget.numeroFacture,
                includeStamp,
              });
              setPdfStampTarget(null);
              downloadPdfMutation.reset();
            } catch (err) {
              // error is kept in downloadPdfMutation.error to render in the dialog
            }
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Annuler la facture"
        description={
          deleteTarget
            ? `Êtes-vous sûr de vouloir annuler la facture ${deleteTarget.numeroFacture} (${deleteTarget.nomClient} - ${deleteTarget.montantTotal} ${deleteTarget.devise || 'MAD'}) ? Cette action effectuera une annulation sécurisée (soft delete).`
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
