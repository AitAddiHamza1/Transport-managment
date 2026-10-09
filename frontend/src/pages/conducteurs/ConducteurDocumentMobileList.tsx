import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import type { DocumentConducteur } from '../../features/documents-conducteurs/types';
import { CONDUCTEUR_DOCUMENT_TYPE_LABELS } from '../../features/documents-conducteurs/types';
import { documentsConducteursApi } from '../../features/documents-conducteurs/documentsConducteursApi';
import { notify } from '../../utils/notify';
import { formatDisplayDate } from '../../utils/formatDate';

interface ConducteurDocumentMobileListProps {
  documents: DocumentConducteur[];
  highlightedId?: number | null;
  onView: (doc: DocumentConducteur) => void;
  onEdit: (doc: DocumentConducteur) => void;
  onDelete: (doc: DocumentConducteur) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ConducteurDocumentMobileList({
  documents,
  highlightedId,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: ConducteurDocumentMobileListProps) {
  const handleDownload = async (doc: DocumentConducteur) => {
    try {
      await documentsConducteursApi.downloadFile(doc.id, doc.originalFileName || undefined);
    } catch (_) {
      notify.error('Erreur lors du téléchargement du document');
    }
  };

  const getStatusChip = (doc: DocumentConducteur) => {
    if (!doc.hasExpirationDate) {
      return <Chip label="Valide — sans expiration" color="success" size="small" />;
    }
    if (doc.status === 'EXPIRE') {
      return <Chip label={`Expiré (${Math.abs(doc.daysUntilExpiry ?? 0)} j)`} color="error" size="small" />;
    }
    if (doc.status === 'BIENTOT_EXPIRE') {
      return <Chip label={`Exp. proche (${doc.daysUntilExpiry} j)`} color="warning" size="small" />;
    }
    return <Chip label={`Valide (${doc.daysUntilExpiry} j)`} color="success" size="small" />;
  };

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {documents.map((doc) => (
        <Card
          key={doc.id}
          id={`card-${doc.id}`}
          variant="outlined"
          sx={{
            borderRadius: 2,
            backgroundColor: highlightedId === doc.id ? '#FEF3C7' : undefined,
            transition: 'background-color 0.5s ease',
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {CONDUCTEUR_DOCUMENT_TYPE_LABELS[doc.typeDocument] || doc.typeDocument}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <AssignmentIndIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="primary.main" fontWeight={600}>
                    {doc.conducteur.nomConducteur}
                  </Typography>
                </Stack>
              </Box>
              {getStatusChip(doc)}
            </Stack>

            <Box sx={{ my: 1, py: 1, borderTop: '1px dashed', borderBottom: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                N° Document : {doc.numeroDocument || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Émission : {doc.dateEmission ? formatDisplayDate(doc.dateEmission) : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Expiration : {doc.dateExpiration ? formatDisplayDate(doc.dateExpiration) : 'Sans expiration'}
              </Typography>
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                {doc.hasFile && (
                  <Chip
                    icon={<FileDownloadIcon />}
                    label="Fichier joint"
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => handleDownload(doc)}
                  />
                )}
              </Box>
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => onView(doc)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
                {canEdit && (
                  <IconButton size="small" color="primary" onClick={() => onEdit(doc)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton size="small" color="error" onClick={() => onDelete(doc)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
