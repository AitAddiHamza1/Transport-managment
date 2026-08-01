import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useVehicleQuery } from '../../features/vehicles/useVehicles';
import { VehiculeStatut } from '../../features/vehicles/types';

interface VehicleDetailDialogProps {
  open: boolean;
  vehicleId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<VehiculeStatut, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  DISPONIBLE: { label: 'Disponible', color: 'success' },
  EN_VOYAGE: { label: 'En voyage', color: 'info' },
  MAINTENANCE: { label: 'Maintenance', color: 'warning' },
  HORS_SERVICE: { label: 'Hors service', color: 'error' },
};

export function VehicleDetailDialog({ open, vehicleId, onClose }: VehicleDetailDialogProps) {
  const { data: vehicle, isLoading, error } = useVehicleQuery(open ? vehicleId : null);

  const statusCfg = vehicle?.statut
    ? STATUT_CONFIG[vehicle.statut] || { label: vehicle.statut, color: 'default' as any }
    : { label: '', color: 'default' as any };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <DirectionsBusIcon color="primary" />
          <Typography variant="h6">Fiche Véhicule</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" py={2}>
            Erreur lors du chargement des détails du véhicule.
          </Typography>
        )}

        {vehicle && (
          <Stack spacing={3}>
            {/* Header identity */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {vehicle.immatriculation}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {vehicle.marque} {vehicle.modele ? `• ${vehicle.modele}` : ''}
                  </Typography>
                </Box>
                <Chip label={statusCfg.label} color={statusCfg.color} sx={{ px: 1, fontWeight: 700 }} />
              </Stack>
            </Paper>

            {/* Specifications Grid */}
            <Typography variant="subtitle1" fontWeight={700}>
              Caractéristiques techniques
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Type de véhicule</Typography>
                <Typography variant="body2" fontWeight={600}>{vehicle.typeVehicule || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Année</Typography>
                <Typography variant="body2" fontWeight={600}>{vehicle.annee || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Capacité de charge</Typography>
                <Typography variant="body2" fontWeight={600}>{vehicle.capaciteCharge !== null ? `${vehicle.capaciteCharge} Tonnes (T)` : '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Numéro de châssis (VIN)</Typography>
                <Typography variant="body2" fontWeight={600}>{vehicle.numeroChassis || '—'}</Typography>
              </Grid>
            </Grid>

            <Divider />

            {/* Documents Read-Only Summary */}
            <Stack direction="row" spacing={1} alignItems="center">
              <FolderOpenIcon color="action" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Documents associés ({vehicle.documents?.length || 0})
              </Typography>
            </Stack>

            {vehicle.documents && vehicle.documents.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Type de document</TableCell>
                      <TableCell>Numéro</TableCell>
                      <TableCell>Expiration</TableCell>
                      <TableCell>Statut</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vehicle.documents.map((doc) => (
                      <TableRow key={doc.idDocument}>
                        <TableCell sx={{ fontWeight: 600 }}>{doc.typeDocument}</TableCell>
                        <TableCell>{doc.numeroDocument || '—'}</TableCell>
                        <TableCell>{doc.dateExpiration ? new Date(doc.dateExpiration).toLocaleDateString('fr-FR') : '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={doc.statut}
                            size="small"
                            color={doc.statut === 'VALIDE' ? 'success' : doc.statut === 'BIENTOT_EXPIRE' ? 'warning' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Aucun document enregistré pour ce véhicule.
              </Typography>
            )}

            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                Enregistré le : {new Date(vehicle.creeLe).toLocaleDateString('fr-FR')}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
