import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
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
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCardIcon from '@mui/icons-material/AddCard';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  useDettesFournisseursQuery,
  useDetteFournisseurStatsQuery,
  useDeleteDetteFournisseur,
  useLocateDetteFournisseur,
} from '../../features/dettes-fournisseurs/useDettesFournisseurs';
import { useFournisseursQuery } from '../../features/fournisseurs/useFournisseurs';
import type { DetteFournisseurView, StatutPaiementCalculated } from '../../features/dettes-fournisseurs/types';

import { StatCard, EmptyState, SearchField } from '../../components/shared';

import { SupplierDebtFormDialog } from './SupplierDebtFormDialog';
import { SupplierDebtDetailDialog } from './SupplierDebtDetailDialog';
import { SupplierDebtsMobileList } from './SupplierDebtsMobileList';
import { AddSupplierPaymentDialog } from '../paiements-fournisseurs/AddSupplierPaymentDialog';
import { CancelSupplierPaymentDialog } from '../paiements-fournisseurs/CancelSupplierPaymentDialog';
import { notify } from '../../utils/notify';
import { formatDisplayDate } from '../../utils/formatDate';

export const SupplierDebtsListPage: React.FC = () => {
  // Query parameters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [idFournisseurFilter, setIdFournisseurFilter] = useState<number | ''>('');
  const [statutFilter, setStatutFilter] = useState<StatutPaiementCalculated | ''>('');
  const [overdueFilter, setOverdueFilter] = useState<boolean | ''>('');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDette, setEditingDette] = useState<DetteFournisseurView | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingDette, setViewingDette] = useState<DetteFournisseurView | null>(null);

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [targetPaymentDette, setTargetPaymentDette] = useState<DetteFournisseurView | null>(null);

  const [isCancelPaymentOpen, setIsCancelPaymentOpen] = useState(false);
  const [targetCancelVersementId, setTargetCancelVersementId] = useState<number | null>(null);

  const [searchParams] = useSearchParams();
  const rawHighlightId = searchParams.get('highlightId');
  const [highlightedId, setHighlightedId] = useState<number | null>(
    rawHighlightId ? Number(rawHighlightId) : null,
  );
  const [targetHighlightId, setTargetHighlightId] = useState<number | null>(
    rawHighlightId ? Number(rawHighlightId) : null,
  );

  const { data: locateData } = useLocateDetteFournisseur(targetHighlightId, 10);

  useEffect(() => {
    if (locateData && locateData.page) {
      setPage(locateData.page);
    }
  }, [locateData]);

  useEffect(() => {
    if (rawHighlightId) {
      const id = Number(rawHighlightId);
      setHighlightedId(id);
      setTargetHighlightId(id);
      const timer = setTimeout(() => {
        setHighlightedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [rawHighlightId]);

  // Queries
  const { data: suppliersData } = useFournisseursQuery({ limit: 100 });
  const suppliers = suppliersData?.data || [];

  const queryParams = {
    page,
    limit: 10,
    search: search.trim() || undefined,
    idFournisseur: idFournisseurFilter !== '' ? Number(idFournisseurFilter) : undefined,
    statutPaiement: statutFilter !== '' ? statutFilter : undefined,
    estEnRetard: overdueFilter !== '' ? Boolean(overdueFilter) : undefined,
  };

  const { data: dettesRes, isLoading: isLoadingDettes } = useDettesFournisseursQuery(queryParams);
  const { data: statsData } = useDetteFournisseurStatsQuery(queryParams);

  useEffect(() => {
    if (highlightedId && !isLoadingDettes && dettesRes?.data?.length) {
      const rowEl = document.getElementById(`row-${highlightedId}`);
      const cardEl = document.getElementById(`card-${highlightedId}`);
      const targetEl = rowEl || cardEl;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedId, isLoadingDettes, dettesRes]);

  const deleteMutation = useDeleteDetteFournisseur();

  const dettes = dettesRes?.data || [];

  const handleCreateNew = () => {
    setEditingDette(null);
    setIsFormOpen(true);
  };

  const handleEdit = (dette: DetteFournisseurView) => {
    setEditingDette(dette);
    setIsFormOpen(true);
  };

  const handleView = (dette: DetteFournisseurView) => {
    setViewingDette(dette);
    setIsDetailOpen(true);
  };

  const handleDelete = (dette: DetteFournisseurView) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la dette #${dette.numeroDette} ?`)) {
      deleteMutation.mutate(dette.id, {
        onSuccess: (res) => {
          notify.success(res.message);
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || 'Erreur lors de la suppression';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
    }
  };

  const handleAddPayment = (dette: DetteFournisseurView) => {
    setTargetPaymentDette(dette);
    setIsAddPaymentOpen(true);
  };

  const handleCancelPayment = (dette: DetteFournisseurView, versementId: number) => {
    setTargetPaymentDette(dette);
    setTargetCancelVersementId(versementId);
    setIsCancelPaymentOpen(true);
  };

  const getStatusChip = (dette: DetteFournisseurView) => {
    if (dette.statutPaiement === 'PAYEE') {
      return <Chip label="PAYÉE" color="success" size="small" variant="filled" />;
    }
    if (dette.statutPaiement === 'PARTIELLEMENT_PAYEE') {
      return <Chip label="PARTIELLE" color="warning" size="small" variant="filled" />;
    }
    return <Chip label="EN ATTENTE" color="info" size="small" variant="outlined" />;
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Dettes fournisseurs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion et suivi des obligations financières envers vos fournisseurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          sx={{ borderRadius: 2 }}
        >
          Nouvelle dette
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Dû"
            value={`${(statsData?.totalDu || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
            helperText="Engagements fournisseurs"
            iconBgColor="primary.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Payé"
            value={`${(statsData?.totalPaye || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
            helperText="Règlements effectués"
            iconBgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Solde Restant"
            value={`${(statsData?.soldeRestant || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
            helperText="Reste à régler"
            iconBgColor={(statsData?.soldeRestant || 0) > 0 ? 'error.light' : 'success.light'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Dettes en Retard"
            value={statsData?.dettesEnRetardCount || 0}
            helperText="Échéances dépassées"
            iconBgColor={(statsData?.dettesEnRetardCount || 0) > 0 ? 'error.light' : 'success.light'}
          />
        </Grid>
      </Grid>

      {/* Filters Bar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <SearchField
              value={search}
              onChange={(val: string) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Rechercher par N° dette, réf. facture, fournisseur..."
            />
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Fournisseur"
              value={idFournisseurFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIdFournisseurFilter(e.target.value === '' ? '' : Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les fournisseurs</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.nomFournisseur}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Statut de paiement"
              value={statutFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setStatutFilter(e.target.value as StatutPaiementCalculated | '');
                setPage(1);
              }}
            >
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="EN_ATTENTE">En attente</MenuItem>
              <MenuItem value="PARTIELLEMENT_PAYEE">Partiellement payée</MenuItem>
              <MenuItem value="PAYEE">Payée (Soldée)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Échéance"
              value={overdueFilter === '' ? '' : String(overdueFilter)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setOverdueFilter(e.target.value === '' ? '' : e.target.value === 'true');
                setPage(1);
              }}
            >
              <MenuItem value="">Toutes</MenuItem>
              <MenuItem value="true">En retard</MenuItem>
              <MenuItem value="false">Dans les délais</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 100 }}>N° Dette</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Réf. Facture</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Fournisseur</TableCell>
                <TableCell sx={{ minWidth: 125, whiteSpace: 'nowrap' }}>Date de Facture</TableCell>
                <TableCell sx={{ minWidth: 115, whiteSpace: 'nowrap' }}>Échéance</TableCell>
                <TableCell align="right" sx={{ minWidth: 135, whiteSpace: 'nowrap' }}>Montant à payer</TableCell>
                <TableCell align="right" sx={{ minWidth: 125, whiteSpace: 'nowrap' }}>Montant payé</TableCell>
                <TableCell align="right" sx={{ minWidth: 105, whiteSpace: 'nowrap' }}>Solde</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingDettes ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    Chargement des dettes...
                  </TableCell>
                </TableRow>
              ) : dettes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <EmptyState
                      title="Aucune dette fournisseur trouvée"
                      description="Aucun enregistrement ne correspond à vos critères de recherche."
                      action={
                        <Button variant="contained" size="small" onClick={handleCreateNew}>
                          Créer une dette
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                dettes.map((dette) => (
                  <TableRow
                    key={dette.id}
                    id={`row-${dette.id}`}
                    hover
                    sx={{
                      backgroundColor: highlightedId === dette.id ? '#FEF3C7' : (dette.estEnRetard ? 'error.lighter' : undefined),
                      transition: 'background-color 0.5s ease',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{dette.numeroDette}</TableCell>
                    <TableCell>{dette.referenceFactureFournisseur || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2' }}>
                      {dette.nomFournisseurSnapshot}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(dette.dateDette)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography
                          variant="body2"
                          color={dette.estEnRetard ? 'error.main' : 'text.primary'}
                          fontWeight={dette.estEnRetard ? 700 : 400}
                        >
                          {formatDisplayDate(dette.dateEcheance)}
                        </Typography>
                        {dette.estEnRetard && (
                          <Tooltip title={`En retard de ${dette.joursRetard} jour(s)`}>
                            <WarningAmberIcon color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {dette.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#2e7d32', whiteSpace: 'nowrap' }}>
                      {dette.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: dette.soldeRestant > 0 ? '#d32f2f' : '#2e7d32',
                      }}
                    >
                      {dette.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </TableCell>
                    <TableCell align="center">{getStatusChip(dette)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Voir détails">
                          <IconButton size="small" color="primary" onClick={() => handleView(dette)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {dette.soldeRestant > 0 && (
                          <Tooltip title="Ajouter un versement">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAddPayment(dette)}
                            >
                              <AddCardIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {dette.paiementsCount === 0 && (
                          <>
                            <Tooltip title="Modifier">
                              <IconButton size="small" color="info" onClick={() => handleEdit(dette)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer la dette">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(dette)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile Card List View */}
      <SupplierDebtsMobileList
        dettes={dettes}
        highlightedId={highlightedId}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddPayment={handleAddPayment}
      />

      {/* Form Dialog (Create / Edit) */}
      {isFormOpen && (
        <SupplierDebtFormDialog
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          detteToEdit={editingDette}
        />
      )}

      {/* Detail Dialog */}
      {isDetailOpen && viewingDette && (
        <SupplierDebtDetailDialog
          open={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          dette={viewingDette}
          onAddPayment={(d) => {
            setIsDetailOpen(false);
            handleAddPayment(d);
          }}
          onCancelPayment={(d, vId) => {
            setIsDetailOpen(false);
            handleCancelPayment(d, vId);
          }}
        />
      )}

      {/* Add Payment Dialog */}
      {isAddPaymentOpen && targetPaymentDette && (
        <AddSupplierPaymentDialog
          open={isAddPaymentOpen}
          onClose={() => setIsAddPaymentOpen(false)}
          dette={targetPaymentDette}
        />
      )}

      {/* Cancel Payment Dialog */}
      {isCancelPaymentOpen && targetPaymentDette && targetCancelVersementId && (
        <CancelSupplierPaymentDialog
          open={isCancelPaymentOpen}
          onClose={() => setIsCancelPaymentOpen(false)}
          dette={targetPaymentDette}
          versementId={targetCancelVersementId}
        />
      )}
    </Stack>
  );
};
