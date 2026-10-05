import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import RouteIcon from '@mui/icons-material/Route';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import type { TraverseeMaritime } from '../../features/traversees-maritimes/types';
import { formatDisplayDate } from '../../utils/formatDate';

interface TraverseeMobileListProps {
  data: TraverseeMaritime[];
  onView: (item: TraverseeMaritime) => void;
  onEdit: (item: TraverseeMaritime) => void;
  onDelete: (item: TraverseeMaritime) => void;
  onToggleVerification?: (item: TraverseeMaritime, section: 'circuit' | 'bateau' | 'transit') => void;
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
        <Typography color="text.secondary">Aucune opération Tanger Med trouvée</Typography>
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
              bgcolor: 'background.paper',
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Header: Date, Vehicle, Voyage */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Opération #{item.id} • {formatDisplayDate(item.dateOperation || item.dateTraversee)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.immatriculation || 'Sans véhicule'} • {item.conducteur?.nomConducteur || 'Chauffeur non renseigné'}
                  </Typography>
                </Box>
                {item.idVoyage ? (
                  <Chip label={`V-00${item.idVoyage}`} size="small" color="info" variant="filled" />
                ) : (
                  <Chip label="Sans voyage" size="small" variant="outlined" color="secondary" />
                )}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* Active Service Sections */}
              <Stack spacing={1.5}>
                {/* 1. Circuit Portuaire Section */}
                {item.hasCircuitPortuaire && (
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <RouteIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            Circuit portuaire
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.circuitNature || 'Circuit'} • {item.circuitMontant != null ? `${item.circuitMontant.toLocaleString('fr-FR')} MAD` : 'Non renseigné'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        icon={item.circuitEstVerifie ? <TaskAltIcon /> : <RadioButtonUncheckedIcon />}
                        label={item.circuitEstVerifie ? 'Vérifié' : 'Non vérifié'}
                        size="small"
                        color={item.circuitEstVerifie ? 'success' : 'default'}
                        variant={item.circuitEstVerifie ? 'filled' : 'outlined'}
                        onClick={() => canEdit && onToggleVerification?.(item, 'circuit')}
                        sx={{ cursor: canEdit ? 'pointer' : 'default' }}
                      />
                    </Stack>
                  </Box>
                )}

                {/* 2. Bateau Section */}
                {item.hasBateau && (
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <DirectionsBoatIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {item.bateau || 'Bateau'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.lieuEmbarquement || '—'} • {item.prix != null ? `${item.prix.toLocaleString('fr-FR')} MAD` : 'Non renseigné'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {item.cheminFichier && (
                          <Chip icon={<AttachFileIcon />} label="Doc" size="small" variant="outlined" color="primary" />
                        )}
                        <Chip
                          icon={item.estVerifiee ? <TaskAltIcon /> : <RadioButtonUncheckedIcon />}
                          label={item.estVerifiee ? 'Vérifié' : 'Non vérifié'}
                          size="small"
                          color={item.estVerifiee ? 'success' : 'default'}
                          variant={item.estVerifiee ? 'filled' : 'outlined'}
                          onClick={() => canEdit && onToggleVerification?.(item, 'bateau')}
                          sx={{ cursor: canEdit ? 'pointer' : 'default' }}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                )}

                {/* 3. Transit Aljaziras Section */}
                {item.hasTransitAljaziras && (
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AltRouteIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            Transit Aljaziras
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.transitTypeService || 'Transit'} • {item.transitPrix != null ? `${item.transitPrix.toLocaleString('fr-FR')} MAD` : 'Non renseigné'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        icon={item.transitEstVerifie ? <TaskAltIcon /> : <RadioButtonUncheckedIcon />}
                        label={item.transitEstVerifie ? 'Vérifié' : 'Non vérifié'}
                        size="small"
                        color={item.transitEstVerifie ? 'success' : 'default'}
                        variant={item.transitEstVerifie ? 'filled' : 'outlined'}
                        onClick={() => canEdit && onToggleVerification?.(item, 'transit')}
                        sx={{ cursor: canEdit ? 'pointer' : 'default' }}
                      />
                    </Stack>
                  </Box>
                )}
              </Stack>

              {/* Action Buttons */}
              <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 1.5 }}>
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

