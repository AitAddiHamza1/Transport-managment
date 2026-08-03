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
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import type { DocumentVehicule } from '../../features/documents-vehicules/types';
import { DOCUMENT_TYPE_LABELS } from '../../features/documents-vehicules/types';
import { documentsVehiculesApi } from '../../features/documents-vehicules/documentsVehiculesApi';

interface VehicleDocumentMobileListProps {
  documents: DocumentVehicule[];
  onView: (doc: DocumentVehicule) => void;
  onEdit: (doc: DocumentVehicule) => void;
  onDelete: (doc: DocumentVehicule) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function VehicleDocumentMobileList({
  documents,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: VehicleDocumentMobileListProps) {
  const getStatusChip = (doc: DocumentVehicule) => {
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
        <Card key={doc.idDocument} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {DOCUMENT_TYPE_LABELS[doc.typeDocument] || doc.typeDocument}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <DirectionsBusIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="primary.main" fontWeight={600}>
                    {doc.immatriculation}
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
                Organisme : {doc.organismeEmetteur || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Expiration : {doc.dateExpiration || 'Sans expiration'}
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
                    onClick={() => window.open(documentsVehiculesApi.getDownloadUrl(doc.idDocument), '_blank')}
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
