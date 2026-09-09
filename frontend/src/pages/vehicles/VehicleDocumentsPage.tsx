import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { PageHeader } from '../../components/shared';
import { ConfirmDialog } from '../../components/shared/dialogs/ConfirmDialog';
import { useAuth } from '../../features/auth/useAuth';
import {
  useCreateDocumentVehiculeMutation,
  useDeleteDocumentVehiculeMutation,
  useDocumentVehiculeStatsQuery,
  useDocumentsVehiculesQuery,
  useUpdateDocumentVehiculeMutation,
  useUploadDocumentFileMutation,
} from '../../features/documents-vehicules/useDocumentsVehicules';
import type {
  CreateDocumentVehiculeInput,
  DerivedDocumentStatus,
  DocumentVehicule,
  UpdateDocumentVehiculeInput,
  VehicleDocumentType,
} from '../../features/documents-vehicules/types';
import {
  DOCUMENT_TYPE_LABELS,
} from '../../features/documents-vehicules/types';
import { documentsVehiculesApi } from '../../features/documents-vehicules/documentsVehiculesApi';
import { useVehiclesQuery } from '../../features/vehicles/useVehicles';
import { VehicleDocumentFormDialog } from './VehicleDocumentFormDialog';
import { VehicleDocumentDetailDialog } from './VehicleDocumentDetailDialog';
import { VehicleDocumentMobileList } from './VehicleDocumentMobileList';

export function VehicleDocumentsPage() {
  const { can } = useAuth();
  const canCreate = can('documents_vehicules', 'ajouter');
  const canEdit = can('documents_vehicules', 'modifier');
  const canDelete = can('documents_vehicules', 'supprimer');

  // Query Params State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [immatriculationFilter, setImmatriculationFilter] = useState('');
  const [typeDocumentFilter, setTypeDocumentFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState<DerivedDocumentStatus | ''>('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<DocumentVehicule | null>(null);
  const [selectedDetailDoc, setSelectedDetailDoc] = useState<DocumentVehicule | null>(null);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<DocumentVehicule | null>(null);

  // Queries & Mutations
  const { data: vehiclesData } = useVehiclesQuery({ limit: 100 });
  const vehicles = vehiclesData?.data ?? [];

  const { data: statsData, isLoading: isStatsLoading } = useDocumentVehiculeStatsQuery();

  const { data: documentsData, isLoading: isDocsLoading } = useDocumentsVehiculesQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    immatriculation: immatriculationFilter || undefined,
    typeDocument: typeDocumentFilter || undefined,
    statut: (statutFilter as DerivedDocumentStatus) || undefined,
    dateExpirationDebut: dateDebut || undefined,
    dateExpirationFin: dateFin || undefined,
  });

  const createMutation = useCreateDocumentVehiculeMutation();
  const updateMutation = useUpdateDocumentVehiculeMutation();
  const deleteMutation = useDeleteDocumentVehiculeMutation();
  const uploadMutation = useUploadDocumentFileMutation();

  const documents = documentsData?.data ?? [];
  const totalCount = documentsData?.meta?.totalItems ?? 0;

  // Reset page when filters change
  const handleFilterChange = () => {
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearch('');
    setImmatriculationFilter('');
    setTypeDocumentFilter('');
    setStatutFilter('');
    setDateDebut('');
    setDateFin('');
    setPage(0);
  };

  const handleOpenCreate = () => {
    setDocumentToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doc: DocumentVehicule) => {
    setDocumentToEdit(doc);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (
    data: CreateDocumentVehiculeInput | UpdateDocumentVehiculeInput,
    file?: File,
  ) => {
    if (documentToEdit) {
      const updated = await updateMutation.mutateAsync({
        id: documentToEdit.idDocument,
        data: data as UpdateDocumentVehiculeInput,
      });
      if (file) {
        await uploadMutation.mutateAsync({ id: updated.idDocument, file });
      }
    } else {
      const created = await createMutation.mutateAsync(data as CreateDocumentVehiculeInput);
      if (file) {
        await uploadMutation.mutateAsync({ id: created.idDocument, file });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetDoc) {
      await deleteMutation.mutateAsync(deleteTargetDoc.idDocument);
      setDeleteTargetDoc(null);
    }
  };

  const getStatusChip = (doc: DocumentVehicule) => {
    if (!doc.hasExpirationDate) {
      return <Chip label="Valide — sans expiration" color="success" size="small" variant="outlined" />;
    }
    if (doc.status === 'EXPIRE') {
      return (
        <Chip
          label={`Expiré (${Math.abs(doc.daysUntilExpiry ?? 0)} j)`}
          color="error"
          size="small"
        />
      );
    }
    if (doc.status === 'BIENTOT_EXPIRE') {
      return (
        <Chip
          label={`Exp. proche (${doc.daysUntilExpiry} j)`}
          color="warning"
          size="small"
        />
      );
    }
    return <Chip label={`Valide (${doc.daysUntilExpiry} j)`} color="success" size="small" />;
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Documents véhicules"
        subtitle="Gestion des cartes grises, assurances, visites techniques et vignettes de la flotte"
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Véhicules', to: '/vehicules' },
          { label: 'Documents véhicules' },
        ]}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Ajouter un document
            </Button>
          ) : undefined
        }
      />

      {/* 4 StatCards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total documents</Typography>
                  {isStatsLoading ? (
                    <Skeleton width={40} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700}>
                      {statsData?.total ?? 0}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <DescriptionIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Documents valides</Typography>
                  {isStatsLoading ? (
                    <Skeleton width={40} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {statsData?.valides ?? 0}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircleOutlineIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Expiration proche (30j)</Typography>
                  {isStatsLoading ? (
                    <Skeleton width={40} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700} color="warning.main">
                      {statsData?.bientotExpires ?? 0}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <WarningAmberIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Documents expirés</Typography>
                  {isStatsLoading ? (
                    <Skeleton width={40} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700} color="error.main">
                      {statsData?.expires ?? 0}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                  <ErrorOutlineIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleFilterChange();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Véhicule */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Véhicule</InputLabel>
              <Select
                value={immatriculationFilter}
                label="Véhicule"
                onChange={(e) => {
                  setImmatriculationFilter(e.target.value);
                  handleFilterChange();
                }}
              >
                <MenuItem value="">Tous les véhicules</MenuItem>
                {vehicles.map((v) => (
                  <MenuItem key={v.id} value={v.immatriculation}>
                    {v.immatriculation}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Type de Document */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeDocumentFilter}
                label="Type"
                onChange={(e) => {
                  setTypeDocumentFilter(e.target.value);
                  handleFilterChange();
                }}
              >
                <MenuItem value="">Tous les types</MenuItem>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([code, label]) => (
                  <MenuItem key={code} value={code}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Statut */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select
                value={statutFilter}
                label="Statut"
                onChange={(e) => {
                  setStatutFilter(e.target.value as DerivedDocumentStatus);
                  handleFilterChange();
                }}
              >
                <MenuItem value="">Tous les statuts</MenuItem>
                <MenuItem value="VALIDE">Valides</MenuItem>
                <MenuItem value="BIENTOT_EXPIRE">Expiration proche (30j)</MenuItem>
                <MenuItem value="EXPIRE">Expirés</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Range Expiration */}
          <Grid item xs={6} sm={3} md={1.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Exp. du"
              InputLabelProps={{ shrink: true }}
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                handleFilterChange();
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={1.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Exp. au"
              InputLabelProps={{ shrink: true }}
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                handleFilterChange();
              }}
            />
          </Grid>

          {(search || immatriculationFilter || typeDocumentFilter || statutFilter || dateDebut || dateFin) && (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
              >
                Réinitialiser les filtres
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Desktop Data Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, display: { xs: 'none', md: 'block' } }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Véhicule</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type de document</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Numéro / Organisme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date Émission</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date Expiration</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Fichier</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isDocsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton height={24} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    Aucun document véhicule trouvé.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc: DocumentVehicule) => (
                <TableRow key={doc.idDocument} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {doc.immatriculation}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.vehicle.marque} {doc.vehicle.modele || ''}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {DOCUMENT_TYPE_LABELS[doc.typeDocument as VehicleDocumentType] || doc.typeDocument}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{doc.numeroDocument || '—'}</Typography>
                    {doc.organismeEmetteur && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {doc.organismeEmetteur}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{doc.dateEmission || '—'}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight={doc.dateExpiration ? 600 : 400}>
                      {doc.dateExpiration || 'Sans expiration'}
                    </Typography>
                  </TableCell>

                  <TableCell>{getStatusChip(doc)}</TableCell>

                  <TableCell align="center">
                    {doc.hasFile ? (
                      <Tooltip title={`Télécharger (${doc.originalFileName || 'fichier'})`}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => window.open(documentsVehiculesApi.getDownloadUrl(doc.idDocument), '_blank')}
                        >
                          <FileDownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Consulter les détails">
                        <IconButton size="small" onClick={() => setSelectedDetailDoc(doc)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Modifier">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(doc)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Supprimer">
                          <IconButton size="small" color="error" onClick={() => setDeleteTargetDoc(doc)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Lignes par page :"
        />
      </TableContainer>

      {/* Mobile Card List */}
      <VehicleDocumentMobileList
        documents={documents}
        onView={(doc) => setSelectedDetailDoc(doc)}
        onEdit={(doc) => handleOpenEdit(doc)}
        onDelete={(doc) => setDeleteTargetDoc(doc)}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Form Dialog */}
      <VehicleDocumentFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        documentToEdit={documentToEdit}
        isSubmitting={createMutation.isPending || updateMutation.isPending || uploadMutation.isPending}
      />

      {/* Detail Dialog */}
      <VehicleDocumentDetailDialog
        open={Boolean(selectedDetailDoc)}
        onClose={() => setSelectedDetailDoc(null)}
        document={selectedDetailDoc}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetDoc)}
        title="Confirmer la suppression"
        description={`Voulez-vous vraiment supprimer le document « ${
          deleteTargetDoc ? (DOCUMENT_TYPE_LABELS[deleteTargetDoc.typeDocument as VehicleDocumentType] || deleteTargetDoc.typeDocument) : ''
        } » du véhicule ${deleteTargetDoc?.immatriculation} ?`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTargetDoc(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
