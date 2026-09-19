import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SpeedIcon from '@mui/icons-material/Speed';
import EventIcon from '@mui/icons-material/Event';

import { Can } from '../../components/shared';
import { MaintenanceIntervention, MaintenanceStatus } from '../../features/carnet-entretien/types';

interface CarnetEntretienMobileListProps {
  interventions: MaintenanceIntervention[];
  onView: (intervention: MaintenanceIntervention) => void;
  onEdit: (intervention: MaintenanceIntervention) => void;
  onDelete: (intervention: MaintenanceIntervention) => void;
}

const STATUS_CONFIG: Record<
  MaintenanceStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  OK: { label: 'OK', color: 'success' },
  UPCOMING: { label: 'À venir', color: 'warning' },
  DUE: { label: 'Échéance', color: 'warning' },
  OVERDUE: { label: 'En retard', color: 'error' },
};

export function CarnetEntretienMobileList({
  interventions,
  onView,
  onEdit,
  onDelete,
}: CarnetEntretienMobileListProps) {
  if (interventions.length === 0) return null;

  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
      {interventions.map((item) => {
        const statusCfg = STATUS_CONFIG[item.statut] || { label: item.statut, color: 'default' };

        const formatKm = (km: number | null) =>
          km !== null && km !== undefined ? `${km.toLocaleString('fr-FR')} km` : '—';

        const formatRemaining = () => {
          if (item.remainingKm === null || item.remainingKm === undefined) return null;
          if (item.remainingKm < 0) {
            return `${Math.abs(item.remainingKm).toLocaleString('fr-FR')} km de retard`;
          }
          return `${item.remainingKm.toLocaleString('fr-FR')} km restants`;
        };

        const remainingText = formatRemaining();

        return (
          <Card
            key={item.id}
            variant="outlined"
            onClick={() => onView(item)}
            sx={{
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 2 },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Header: Vehicle & Status */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalShippingIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    {item.immatriculation}
                  </Typography>
                </Stack>
                <Chip
                  label={statusCfg.label}
                  color={statusCfg.color}
                  size="small"
                  sx={{ fontWeight: 700, height: 24 }}
                />
              </Stack>

              {/* Maintenance Title */}
              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <BuildIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {item.libelle}
                </Typography>
              </Stack>

              {/* Grid info */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1,
                  p: 1.25,
                  bgcolor: 'action.hover',
                  borderRadius: 1.5,
                  mb: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Dernière intervention
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {item.dateIntervention} ({formatKm(item.kilometrageRealise)})
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Kilométrage actuel
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    {formatKm(item.currentVehicleMileage)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Prochaine échéance
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatKm(item.prochainKmEcheance)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Reste
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={
                      item.remainingKm !== null && item.remainingKm < 0
                        ? 'error.main'
                        : item.remainingKm !== null && item.remainingKm <= 1000
                        ? 'warning.main'
                        : 'success.main'
                    }
                  >
                    {remainingText || '—'}
                  </Typography>
                </Box>
              </Box>

              {/* Action buttons */}
              <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                <IconButton
                  size="small"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(item);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>

                <Can module="carnet_entretien" action="modifier">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Can>

                <Can module="carnet_entretien" action="supprimer">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Can>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
