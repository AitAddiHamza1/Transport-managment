import { useState } from 'react';
import {
  Box,
  Button,
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
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import {
  AppPagination,
  ConfirmDialog,
  DataTableShell,
  ListToolbar,
  PageHeader,
  SearchField,
  StatCard,
  StatusChip,
} from '../../components/shared';
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
import { notify } from '../../utils/notify';
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

  const handleDownloadDoc = async (doc: DocumentVehicule) => {
    try {
      await documentsVehiculesApi.downloadFile(doc.idDocument, doc.originalFileName || undefined);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    }
  };

  const getStatusChip = (doc: DocumentVehicule) => {
    if (!doc.hasExpirationDate) {
      return <StatusChip label="Valide — sans expiration" variant="success" />;
    }
    if (doc.status === 'EXPIRE') {
      return (
        <StatusChip
          label={`Expiré (${Math.abs(doc.daysUntilExpiry ?? 0)} j)`}
          variant="error"
        />
      );
    }
    if (doc.status === 'BIENTOT_EXPIRE') {
      return (
        <StatusChip
          label={`Exp. proche (${doc.daysUntilExpiry} j)`}
          variant="warning"
        />
      );
    }
    return <StatusChip label={`Valide (${doc.daysUntilExpiry} j)`} variant="success" />;
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Documents véhicules"
        subtitle="Gestion des cartes grises, assurances, visites techniques et vignettes de la flotte"
        hideBreadcrumbs
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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Total documents"
          value={statsData?.total ?? 0}
          icon={<DescriptionIcon />}
          iconBgColor="primary.light"
          loading={isStatsLoading}
        />

        <StatCard
          label="Documents valides"
          value={statsData?.valides ?? 0}
          icon={<CheckCircleOutlineIcon />}
          iconBgColor="success.light"
          valueColor="success.main"
          loading={isStatsLoading}
        />

        <StatCard
          label="Expiration proche (30j)"
          value={statsData?.bientotExpires ?? 0}
          icon={<WarningAmberIcon />}
          iconBgColor="warning.light"
          valueColor="warning.main"
          loading={isStatsLoading}
        />

        <StatCard
          label="Documents expirés"
          value={statsData?.expires ?? 0}
          icon={<ErrorOutlineIcon />}
          iconBgColor="error.light"
          valueColor="error.main"
          loading={isStatsLoading}
        />
      </Box>

      {/* Filter Toolbar */}
      <Box sx={{ mb: 2 }}>
        <ListToolbar
          searchField={
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                handleFilterChange();
              }}
              placeholder="Rechercher..."
            />
          }
          onResetFilters={
            search || immatriculationFilter || typeDocumentFilter || statutFilter || dateDebut || dateFin
              ? handleClearFilters
              : undefined
          }
        >
          <TextField
            select
            value={immatriculationFilter}
            onChange={(e) => {
              setImmatriculationFilter(e.target.value);
              handleFilterChange();
            }}
            label="Véhicule"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 160 }}
          >
            <option value="">Tous les véhicules</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.immatriculation}>
                {v.immatriculation}
              </option>
            ))}
          </TextField>

          <TextField
            select
            value={typeDocumentFilter}
            onChange={(e) => {
              setTypeDocumentFilter(e.target.value);
              handleFilterChange();
            }}
            label="Type"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 160 }}
          >
            <option value="">Tous les types</option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </TextField>

          <TextField
            select
            value={statutFilter}
            onChange={(e) => {
              setStatutFilter(e.target.value as DerivedDocumentStatus);
              handleFilterChange();
            }}
            label="Statut"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 150 }}
          >
            <option value="">Tous les statuts</option>
            <option value="VALIDE">Valides</option>
            <option value="BIENTOT_EXPIRE">Expiration proche (30j)</option>
            <option value="EXPIRE">Expirés</option>
          </TextField>

          <TextField
            size="small"
            type="date"
            label="Exp. du"
            InputLabelProps={{ shrink: true }}
            value={dateDebut}
            onChange={(e) => {
              setDateDebut(e.target.value);
              handleFilterChange();
            }}
            sx={{ minWidth: 130 }}
          />

          <TextField
            size="small"
            type="date"
            label="Exp. au"
            InputLabelProps={{ shrink: true }}
            value={dateFin}
            onChange={(e) => {
              setDateFin(e.target.value);
              handleFilterChange();
            }}
            sx={{ minWidth: 130 }}
          />
        </ListToolbar>
      </Box>

      {/* Desktop Data Table */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell density="dense">
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
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
                            onClick={() => handleDownloadDoc(doc)}
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
          <AppPagination
            page={page + 1}
            pageSize={rowsPerPage}
            totalCount={totalCount}
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

