import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader, StatCard } from '../../components/shared';
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

const STATUT_CONFIG: Record<
  EmployeStatut,
  { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' }
> = {
  ACTIF: { label: 'Actif', color: 'success' },
  SUSPENDU: { label: 'Suspendu', color: 'warning' },
  DEMISSIONNAIRE: { label: 'Démissionnaire', color: 'default' },
  LICENCIE: { label: 'Licencié', color: 'error' },
  RETRAITE: { label: 'Retraité', color: 'default' },
  INACTIF: { label: 'Inactif', color: 'error' },
};

export function EmployeListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
  const { data: employesData, isLoading, isFetching, error } = useEmployesQuery(queryParams);
  const { data: stats } = useEmployeStats();
  const deleteMutation = useDeleteEmploye();

  const employes = employesData?.data || [];
  const totalCount = employesData?.meta.total || 0;

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
    <Stack spacing={3}>
      {/* Header */}
      <PageHeader
        title="Gestion des Employés"
        subtitle="Référentiel RH des collaborateurs et suivi des effectifs"
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

      {/* KPI Stats Bar */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Employés"
            value={stats?.total ?? 0}
            icon={<PeopleIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Employés Actifs"
            value={stats?.actifs ?? 0}
            icon={<CheckCircleOutlineIcon color="success" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Suspendus"
            value={stats?.suspendus ?? 0}
            icon={<PauseCircleOutlineIcon color="warning" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Employés Sortis"
            value={stats?.sortis ?? 0}
            icon={<ExitToAppIcon color="action" />}
          />
        </Grid>
      </Grid>

      {/* Main Content Area */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Filter Toolbar */}
        <Box sx={{ p: 2, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher par nom, CIN, poste..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Statut"
                value={selectedStatut}
                onChange={(e) => {
                  setSelectedStatut(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Tous les statuts</MenuItem>
                <MenuItem value="ACTIF">Actif</MenuItem>
                <MenuItem value="SUSPENDU">Suspendu</MenuItem>
                <MenuItem value="DEMISSIONNAIRE">Démissionnaire</MenuItem>
                <MenuItem value="LICENCIE">Licencié</MenuItem>
                <MenuItem value="RETRAITE">Retraité</MenuItem>
                <MenuItem value="INACTIF">Inactif</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Type Contrat"
                value={selectedContrat}
                onChange={(e) => {
                  setSelectedContrat(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Tous les contrats</MenuItem>
                <MenuItem value="CDI">CDI</MenuItem>
                <MenuItem value="CDD">CDD</MenuItem>
                <MenuItem value="STAGE">Stage</MenuItem>
                <MenuItem value="TEMPORAIRE">Intérim</MenuItem>
                <MenuItem value="FREELANCE">Freelance</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Paiement"
                value={selectedPaiement}
                onChange={(e) => {
                  setSelectedPaiement(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Tous les modes</MenuItem>
                <MenuItem value="VIREMENT">Virement</MenuItem>
                <MenuItem value="ESPECES">Espèces</MenuItem>
                <MenuItem value="CHEQUE">Chèque</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Département"
                placeholder="Ex: RH, Exploitation"
                value={departementFilter}
                onChange={(e) => {
                  setDepartementFilter(e.target.value);
                  setPage(0);
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={1}>
              <Tooltip title="Réinitialiser les filtres">
                <IconButton onClick={handleClearFilters} color="inherit">
                  <FilterAltOffIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Box>

        {/* Loading Indicator */}
        {isFetching && <LinearProgress />}

        {/* Content Table or Mobile View */}
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="error">
              Une erreur est survenue lors du chargement des employés.
            </Typography>
          </Box>
        ) : isMobile ? (
          <EmployeMobileList
            employes={employes}
            onView={handleOpenDetail}
            onEdit={handleOpenEdit}
            onDocuments={handleOpenDocuments}
            onDelete={(emp) => setDeleteTarget(emp)}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Employé</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Matricule</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CIN</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Poste / Dép.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contrat</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Embauche</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Salaire Base</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="body1" color="text.secondary">
                        Aucun employé ne correspond aux critères de recherche.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  employes.map((emp) => {
                    const statusCfg = STATUT_CONFIG[emp.statut] || {
                      label: emp.statut,
                      color: 'default',
                    };
                    return (
                      <TableRow key={emp.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                              src={emp.hasPhoto ? employesApi.getPhotoUrl(emp.id) : undefined}
                              sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
                            >
                              <PersonIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {emp.prenom} {emp.nom}
                              </Typography>
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

                        <TableCell>
                          <Typography variant="body2">{emp.cin || '—'}</Typography>
                        </TableCell>

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

                        <TableCell>
                          <Typography variant="body2">{emp.dateEmbauche}</Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {emp.salaireBase !== null
                              ? `${emp.salaireBase.toLocaleString('fr-FR')} MAD`
                              : '—'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
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
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalCount}
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
      </Paper>

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
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </Stack>
  );
}
