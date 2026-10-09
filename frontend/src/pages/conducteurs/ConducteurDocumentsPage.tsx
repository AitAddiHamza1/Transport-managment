import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
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
  useCreateDocumentConducteurMutation,
  useDeleteDocumentConducteurMutation,
  useDocumentConducteurStatsQuery,
  useDocumentsConducteursQuery,
  useLocateDocumentConducteur,
  useUpdateDocumentConducteurMutation,
  useUploadDocumentConducteurFileMutation,
} from '../../features/documents-conducteurs/useDocumentsConducteurs';
import type {
  CreateDocumentConducteurInput,
  DerivedDocumentStatus,
  DocumentConducteur,
  UpdateDocumentConducteurInput,
} from '../../features/documents-conducteurs/types';
import { CONDUCTEUR_DOCUMENT_TYPE_LABELS } from '../../features/documents-conducteurs/types';
import { documentsConducteursApi } from '../../features/documents-conducteurs/documentsConducteursApi';
import { useConducteursQuery } from '../../features/conducteurs/useConducteurs';
import { notify } from '../../utils/notify';
import { formatDisplayDate } from '../../utils/formatDate';
import { ConducteurDocumentFormDialog } from './ConducteurDocumentFormDialog';
import { ConducteurDocumentDetailDialog } from './ConducteurDocumentDetailDialog';
import { ConducteurDocumentMobileList } from './ConducteurDocumentMobileList';

export function ConducteurDocumentsPage() {
  const { can } = useAuth();
  const canCreate = can('documents_conducteurs', 'ajouter');
  const canEdit = can('documents_conducteurs', 'modifier');
  const canDelete = can('documents_conducteurs', 'supprimer');

  // Query Params State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [idConducteurFilter, setIdConducteurFilter] = useState<number | ''>('');
  const [typeDocumentFilter, setTypeDocumentFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState<DerivedDocumentStatus | ''>('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<DocumentConducteur | null>(null);
  const [selectedDetailDoc, setSelectedDetailDoc] = useState<DocumentConducteur | null>(null);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<DocumentConducteur | null>(null);

  const [searchParams] = useSearchParams();
  const rawHighlightId = searchParams.get('highlightId');
  const [highlightedId, setHighlightedId] = useState<number | null>(
    rawHighlightId ? Number(rawHighlightId) : null,
  );
  const [targetHighlightId, setTargetHighlightId] = useState<number | null>(
    rawHighlightId ? Number(rawHighlightId) : null,
  );

  const { data: locateData } = useLocateDocumentConducteur(targetHighlightId, rowsPerPage);

  useEffect(() => {
    if (locateData && locateData.page) {
      setPage(locateData.page - 1);
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

  // Queries & Mutations
  const { data: conducteursData } = useConducteursQuery({ limit: 100 });
  const conducteurs = conducteursData?.data ?? [];

  const { data: statsData, isLoading: isStatsLoading } = useDocumentConducteurStatsQuery();

  const { data: documentsData, isLoading: isDocsLoading } = useDocumentsConducteursQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    idConducteur: idConducteurFilter ? Number(idConducteurFilter) : undefined,
    typeDocument: typeDocumentFilter || undefined,
    statut: (statutFilter as DerivedDocumentStatus) || undefined,
    dateExpirationDebut: dateDebut || undefined,
    dateExpirationFin: dateFin || undefined,
  });

  useEffect(() => {
    if (highlightedId && !isDocsLoading && documentsData?.data?.length) {
      const rowEl = document.getElementById(`row-${highlightedId}`);
      const cardEl = document.getElementById(`card-${highlightedId}`);
      const targetEl = rowEl || cardEl;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedId, isDocsLoading, documentsData]);

  const createMutation = useCreateDocumentConducteurMutation();
  const updateMutation = useUpdateDocumentConducteurMutation();
  const deleteMutation = useDeleteDocumentConducteurMutation();
  const uploadMutation = useUploadDocumentConducteurFileMutation();

  const documents = documentsData?.data ?? [];
  const totalCount = documentsData?.meta?.totalItems ?? 0;

  // Reset page when filters change
  const handleFilterChange = () => {
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearch('');
    setIdConducteurFilter('');
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

  const handleOpenEdit = (doc: DocumentConducteur) => {
    setDocumentToEdit(doc);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (
    data: CreateDocumentConducteurInput | UpdateDocumentConducteurInput,
    file?: File,
  ) => {
    if (documentToEdit) {
      const updated = await updateMutation.mutateAsync({
        id: documentToEdit.id,
        data: data as UpdateDocumentConducteurInput,
      });
      if (file) {
        await uploadMutation.mutateAsync({ id: updated.id, file });
      }
    } else {
      const created = await createMutation.mutateAsync(data as CreateDocumentConducteurInput);
      if (file) {
        await uploadMutation.mutateAsync({ id: created.id, file });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetDoc) {
      await deleteMutation.mutateAsync(deleteTargetDoc.id);
      setDeleteTargetDoc(null);
    }
  };

  const handleDownloadDoc = async (doc: DocumentConducteur) => {
    try {
      await documentsConducteursApi.downloadFile(doc.id, doc.originalFileName || undefined);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    }
  };

  const getStatusChip = (doc: DocumentConducteur) => {
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
        title="Documents conducteurs"
        subtitle="Gestion des passeports, visas, permis de conduire et cartes de santé de l'équipe de conduite"
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
            search || idConducteurFilter || typeDocumentFilter || statutFilter || dateDebut || dateFin
              ? handleClearFilters
              : undefined
          }
        >
          <TextField
            select
            value={idConducteurFilter}
            onChange={(e) => {
              setIdConducteurFilter(e.target.value ? Number(e.target.value) : '');
              handleFilterChange();
            }}
            label="Conducteur"
            size="small"
            SelectProps={{ native: true }}
            sx={{ minWidth: 170 }}
          >
            <option value="">Tous les conducteurs</option>
            {conducteurs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomConducteur}
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
            {Object.entries(CONDUCTEUR_DOCUMENT_TYPE_LABELS).map(([code, label]) => (
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
                <TableCell sx={{ fontWeight: 700 }}>Conducteur</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type de document</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Numéro</TableCell>
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
                      Aucun document conducteur trouvé.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc: DocumentConducteur) => (
                  <TableRow
                    key={doc.id}
                    id={`row-${doc.id}`}
                    hover
                    sx={{
                      bgcolor: highlightedId === doc.id ? '#FEF3C7' : undefined,
                      transition: 'background-color 0.5s ease',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {doc.conducteur.nomConducteur}
                      </Typography>
                      {doc.conducteur.telephone && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {doc.conducteur.telephone}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {CONDUCTEUR_DOCUMENT_TYPE_LABELS[doc.typeDocument] || doc.typeDocument}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{doc.numeroDocument || '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{doc.dateEmission ? formatDisplayDate(doc.dateEmission) : '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={doc.dateExpiration ? 600 : 400}>
                        {doc.dateExpiration ? formatDisplayDate(doc.dateExpiration) : 'Sans expiration'}
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
      <ConducteurDocumentMobileList
        documents={documents}
        highlightedId={highlightedId}
        onView={(doc) => setSelectedDetailDoc(doc)}
        onEdit={(doc) => handleOpenEdit(doc)}
        onDelete={(doc) => setDeleteTargetDoc(doc)}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Form Dialog */}
      <ConducteurDocumentFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        documentToEdit={documentToEdit}
        isSubmitting={createMutation.isPending || updateMutation.isPending || uploadMutation.isPending}
      />

      {/* Detail Dialog */}
      <ConducteurDocumentDetailDialog
        open={Boolean(selectedDetailDoc)}
        onClose={() => setSelectedDetailDoc(null)}
        document={selectedDetailDoc}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetDoc)}
        title="Confirmer la suppression"
        description={`Voulez-vous vraiment supprimer le document « ${
          deleteTargetDoc ? (CONDUCTEUR_DOCUMENT_TYPE_LABELS[deleteTargetDoc.typeDocument] || deleteTargetDoc.typeDocument) : ''
        } » du conducteur ${deleteTargetDoc?.conducteur?.nomConducteur} ?`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTargetDoc(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
