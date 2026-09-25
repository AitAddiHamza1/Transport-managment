import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { EmployeAvatar } from '../../components/employes/EmployeAvatar';
import { useState, useEffect, useMemo } from 'react';
import {
  AppPagination,
  DataTableShell,
  KpiGrid,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';
import { Can } from '../../components/shared/Can';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import {
  useEmployesQuery,
  useEmployeStats,
  useDeleteEmploye,
} from '../../features/employes/useEmployes';
import {
  ContratType,
  Employe,
  EmployeStatut,
  PaiementModeEmploye,
} from '../../features/employes/types';
import { employesApi } from '../../features/employes/employesApi';
import { EmployeMobileList } from './EmployeMobileList';
import { EmployeFormDialog } from './EmployeFormDialog';
import { EmployeDetailDialog } from './EmployeDetailDialog';
import { EmployeDocumentDialog } from './EmployeDocumentDialog';

const STATUT_CONFIG: Record<EmployeStatut, { label: string }> = {
  ACTIF: { label: 'Actif' },
  SUSPENDU: { label: 'Suspendu' },
  DEMISSIONNAIRE: { label: 'Démissionnaire' },
  LICENCIE: { label: 'Licencié' },
  RETRAITE: { label: 'Retraité' },
  INACTIF: { label: 'Inactif' },
};

export function EmployeListPage() {
  // Query State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL');
  const [selectedContrat, setSelectedContrat] = useState<string>('ALL');
  const [selectedPaiement, setSelectedPaiement] = useState<string>('ALL');
  const [departementFilter, setDepartementFilter] = useState('');

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEmploye, setFormEmploye] = useState<Employe | null>(null);

  const [detailEmployeId, setDetailEmployeId] = useState<number | null>(null);

  const [documentEmploye, setDocumentEmploye] = useState<Employe | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Employe | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Query Params
  const queryParams = useMemo(() => {
    return {
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      statut: selectedStatut !== 'ALL' ? (selectedStatut as EmployeStatut) : undefined,
      typeContrat: selectedContrat !== 'ALL' ? (selectedContrat as ContratType) : undefined,
      modePaiement: selectedPaiement !== 'ALL' ? (selectedPaiement as PaiementModeEmploye) : undefined,
      departement: departementFilter.trim() || undefined,
    };
  }, [page, rowsPerPage, debouncedSearch, selectedStatut, selectedContrat, selectedPaiement, departementFilter]);

  // Queries & Mutations
  const { data: employesData, isLoading, error } = useEmployesQuery(queryParams);
  const { data: stats } = useEmployeStats();
  const deleteMutation = useDeleteEmploye();

  const employes = employesData?.data || [];
  const totalCount = employesData?.meta.total || 0;

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      (selectedStatut && selectedStatut !== 'ALL') ||
      (selectedContrat && selectedContrat !== 'ALL') ||
      (selectedPaiement && selectedPaiement !== 'ALL') ||
      departementFilter.trim(),
  );

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedStatut('ALL');
    setSelectedContrat('ALL');
    setSelectedPaiement('ALL');
    setDepartementFilter('');
    setPage(0);
  };

  const handleOpenCreate = () => {
    setFormEmploye(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp: Employe) => {
    setFormEmploye(emp);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (emp: Employe) => {
    setDetailEmployeId(emp.id);
  };

  const handleOpenDocuments = (emp: Employe) => {
    setDocumentEmploye(emp);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header with hideBreadcrumbs */}
      <PageHeader
        title="Gestion des Employés"
        subtitle="Référentiel RH des collaborateurs et suivi des effectifs"
        hideBreadcrumbs
        action={
          <Can module="employes" action="ajouter">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Nouvel Employé
            </Button>
          </Can>
        }
      />

      {/* KPI Stats Bar (4 cards, responsive 2-column mobile / 4-column desktop) */}
      <KpiGrid columns={4}>
        <StatCard
          label="Total Employés"
          value={stats?.total ?? 0}
          icon={<PeopleIcon />}
          iconBgColor="primary.light"
        />

        <StatCard
          label="Employés Actifs"
          value={stats?.actifs ?? 0}
          icon={<CheckCircleOutlineIcon />}
          iconBgColor="success.light"
          valueColor="success.main"
        />

        <StatCard
          label="Suspendus"
          value={stats?.suspendus ?? 0}
          icon={<PauseCircleOutlineIcon />}
          iconBgColor="warning.light"
          valueColor="warning.main"
        />

        <StatCard
          label="Employés Sortis"
          value={stats?.sortis ?? 0}
          icon={<ExitToAppIcon />}
          iconBgColor="action.hover"
          valueColor="text.secondary"
        />
      </KpiGrid>

      {/* Filter Toolbar */}
      <ListToolbar
        searchField={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par nom, CIN, poste..."
          />
        }
        onResetFilters={hasActiveFilters ? handleClearFilters : undefined}
        resetDisabled={!hasActiveFilters}
      >
        <TextField
          select
          size="small"
          label="Statut"
          value={selectedStatut}
          onChange={(e) => {
            setSelectedStatut(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Tous les statuts</MenuItem>
          <MenuItem value="ACTIF">Actif</MenuItem>
          <MenuItem value="SUSPENDU">Suspendu</MenuItem>
          <MenuItem value="DEMISSIONNAIRE">Démissionnaire</MenuItem>
          <MenuItem value="LICENCIE">Licencié</MenuItem>
          <MenuItem value="RETRAITE">Retraité</MenuItem>
          <MenuItem value="INACTIF">Inactif</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Type Contrat"
          value={selectedContrat}
          onChange={(e) => {
            setSelectedContrat(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Tous les contrats</MenuItem>
          <MenuItem value="CDI">CDI</MenuItem>
          <MenuItem value="CDD">CDD</MenuItem>
          <MenuItem value="STAGE">Stage</MenuItem>
          <MenuItem value="TEMPORAIRE">Intérim</MenuItem>
          <MenuItem value="FREELANCE">Freelance</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Paiement"
          value={selectedPaiement}
          onChange={(e) => {
            setSelectedPaiement(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">Tous les modes</MenuItem>
          <MenuItem value="VIREMENT">Virement</MenuItem>
          <MenuItem value="ESPECES">Espèces</MenuItem>
          <MenuItem value="CHEQUE">Chèque</MenuItem>
        </TextField>

        <TextField
          size="small"
          label="Département"
          placeholder="Ex: RH, Exploitation"
          value={departementFilter}
          onChange={(e) => {
            setDepartementFilter(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        />
      </ListToolbar>

      {/* Error state */}
      {error && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
          <Typography variant="body1">
            Une erreur est survenue lors du chargement des employés.
          </Typography>
        </Paper>
      )}

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell
          density="dense"
          loading={isLoading}
          pagination={
            <AppPagination
              page={page + 1}
              pageSize={rowsPerPage}
              totalCount={totalCount}
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
                <TableCell>Employé</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>CIN</TableCell>
                <TableCell>Poste / Dép.</TableCell>
                <TableCell>Contrat</TableCell>
                <TableCell>Embauche</TableCell>
                <TableCell>Salaire Base</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employes.length > 0 ? (
                employes.map((emp) => {
                  return (
                    <TableRow key={emp.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <EmployeAvatar
                            employeId={emp.id}
                            hasPhoto={emp.hasPhoto}
                            updatedTimestamp={emp.misAJourLe}
                            prenom={emp.prenom}
                            nom={emp.nom}
                            sx={{ width: 36, height: 36 }}
                          />
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle2" fontWeight={600}>
                                {emp.prenom} {emp.nom}
                              </Typography>
                              {emp.conducteur && (
                                <Tooltip title={`Conducteur - Statut opérationnel: ${emp.conducteur.statut}`}>
                                  <Chip
                                    label="Conducteur"
                                    size="small"
                                    color="primary"
                                    variant="filled"
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                                  />
                                </Tooltip>
                              )}
                            </Stack>
                            {emp.telephone && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {emp.telephone}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {emp.matricule}
                        </Typography>
                      </TableCell>

                      <TableCell>{emp.cin || '—'}</TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {emp.poste}
                        </Typography>
                        {emp.departement && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {emp.departement}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip label={emp.typeContrat} size="small" variant="outlined" />
                      </TableCell>

                      <TableCell>{emp.dateEmbauche}</TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {emp.salaireBase !== null
                            ? `${emp.salaireBase.toLocaleString('fr-FR')} MAD`
                            : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <StatusChip
                          variant={emp.statut}
                          label={STATUT_CONFIG[emp.statut]?.label || emp.statut}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Consulter la fiche">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleOpenDetail(emp)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {emp.conducteur && (
                            <Tooltip title="Fiche Conducteur">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => {
                                  if (emp.conducteur) {
                                    window.location.href = `/conducteurs/liste?conducteurId=${emp.conducteur.id}`;
                                  }
                                }}
                              >
                                <PeopleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Can module="employes" action="modifier">
                            <Tooltip title="Documents RH">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenDocuments(emp)}
                              >
                                <FolderIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Modifier">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleOpenEdit(emp)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Can>

                          <Can module="employes" action="supprimer">
                            <Tooltip title="Supprimer">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(emp)}
                              >
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
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    {hasActiveFilters ? (
                      /* Empty state: Active filters */
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}>
                          <SearchIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={600}>
                            Aucun résultat trouvé
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Aucun employé ne correspond aux critères sélectionnés.
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FilterAltOffIcon />}
                          onClick={handleClearFilters}
                        >
                          Réinitialiser les filtres
                        </Button>
                      </Stack>
                    ) : (
                      /* Empty state: No employees */
                      <Stack spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.light', color: 'primary.main' }}>
                          <PeopleIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={600}>
                            Aucun employé enregistré
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Ajoutez votre premier employé pour commencer.
                          </Typography>
                        </Box>
                        <Can module="employes" action="ajouter">
                          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                            Nouvel Employé
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

      {/* Mobile View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <EmployeMobileList
          employes={employes}
          onView={handleOpenDetail}
          onEdit={handleOpenEdit}
          onDocuments={handleOpenDocuments}
          onDelete={(emp) => setDeleteTarget(emp)}
        />
      </Box>

      {/* Dialogs */}
      <EmployeFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        employe={formEmploye}
      />

      <EmployeDetailDialog
        open={Boolean(detailEmployeId)}
        onClose={() => setDetailEmployeId(null)}
        employeId={detailEmployeId}
        onEdit={handleOpenEdit}
        onDocuments={handleOpenDocuments}
      />

      <EmployeDocumentDialog
        open={Boolean(documentEmploye)}
        onClose={() => setDocumentEmploye(null)}
        employe={documentEmploye}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer l’employé"
        description={`Êtes-vous sûr de vouloir supprimer l’employé ${deleteTarget?.prenom} ${deleteTarget?.nom} (${deleteTarget?.matricule}) ? Cette action masquera l’employé.`}
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

