import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import type { TraverseeMaritime } from '../../features/traversees-maritimes/types';

interface TraverseeMobileListProps {
  data: TraverseeMaritime[];
  onView: (item: TraverseeMaritime) => void;
  onEdit: (item: TraverseeMaritime) => void;
  onDelete: (item: TraverseeMaritime) => void;
  onToggleVerification?: (item: TraverseeMaritime) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function TraverseeMobileList({
  data,
  onView,
  onEdit,
  onDelete,
  onToggleVerification,
  canEdit,
  canDelete,
}: TraverseeMobileListProps) {
  if (data.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune traversée maritime trouvée</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {data.map((item) => {
        return (
          <Card
            key={item.id}
            variant="outlined"
            sx={{
              borderRadius: 2,
              opacity: item.estVerifiee ? 0.75 : 1,
              bgcolor: item.estVerifiee ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <DirectionsBoatIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 180 }}>
                      {item.bateau}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {item.dateTraversee} • {item.lieuEmbarquement}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  {item.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" gap={0.5}>
                {item.estVerifiee ? (
                  <Chip
                    icon={<TaskAltIcon />}
                    label="Vérifiée"
                    size="small"
                    color="success"
                    variant="filled"
                    onClick={() => canEdit && onToggleVerification?.(item)}
                  />
                ) : (
                  <Chip
                    icon={<RadioButtonUncheckedIcon />}
                    label="Non vérifiée"
                    size="small"
                    variant="outlined"
                    color="default"
                    onClick={() => canEdit && onToggleVerification?.(item)}
                  />
                )}
                <Chip
                  label={item.immatriculation}
                  size="small"
                  variant="outlined"
                  color="default"
                />
                <Chip
                  label={item.conducteur?.nomConducteur || 'Chauffeur non renseigné'}
                  size="small"
                  variant="outlined"
                />
                {item.idVoyage ? (
                  <Chip
                    label={`V-00${item.idVoyage}`}
                    size="small"
                    color="info"
                    variant="filled"
                  />
                ) : (
                  <Chip label="Sans voyage" size="small" variant="outlined" color="secondary" />
                )}
                {item.cheminFichier && (
                  <Chip
                    icon={<AttachFileIcon />}
                    label="Justificatif"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Stack>

              <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 1 }}>
                {canEdit && onToggleVerification && (
                  <Tooltip title={item.estVerifiee ? 'Vérifiée (cliquer pour annuler)' : 'Marquer comme vérifiée'}>
                    <IconButton size="small" color={item.estVerifiee ? 'success' : 'default'} onClick={() => onToggleVerification(item)}>
                      {item.estVerifiee ? <TaskAltIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small" color="info" onClick={() => onView(item)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
                {canEdit && (
                  <IconButton size="small" color="primary" onClick={() => onEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton size="small" color="error" onClick={() => onDelete(item)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
