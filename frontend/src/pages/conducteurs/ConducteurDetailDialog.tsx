import {
  Avatar,
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
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';
import { useConducteurQuery } from '../../features/conducteurs/useConducteurs';
import { ConducteurStatut } from '../../features/conducteurs/types';

interface ConducteurDetailDialogProps {
  open: boolean;
  driverId: number | null;
  onClose: () => void;
}

const STATUT_CONFIG: Record<ConducteurStatut, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  DISPONIBLE: { label: 'Disponible', color: 'success' },
  EN_VOYAGE: { label: 'En voyage', color: 'info' },
  INDISPONIBLE: { label: 'Indisponible', color: 'warning' },
  INACTIF: { label: 'Inactif', color: 'error' },
};

export function ConducteurDetailDialog({ open, driverId, onClose }: ConducteurDetailDialogProps) {
  const { data: driver, isLoading, isError } = useConducteurQuery(driverId);

  const statusCfg = driver ? STATUT_CONFIG[driver.statut] || { label: driver.statut, color: 'default' as any } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {driver?.nomConducteur || 'Fiche Conducteur'}
            </Typography>
            {driver && (
              <Typography variant="caption" color="text.secondary">
                Identifiant #{driver.id} • Enregistré le {new Date(driver.creeLe).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Chargement des détails du conducteur...
            </Typography>
          </Stack>
        )}

        {isError && (
          <Typography color="error" align="center" sx={{ py: 4 }}>
            Impossible de charger la fiche conducteur.
          </Typography>
        )}

        {driver && statusCfg && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Statut actuel
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Téléphone
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight={600}>
                    {driver.telephone || 'Non renseigné'}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Adresse
                </Typography>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
                  <HomeIcon fontSize="small" color="action" />
                  <Typography variant="body2">{driver.adresse || 'Non renseignée'}</Typography>
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            {/* Document summary list */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Documents enregistrés ({driver.documents?.length ?? 0})
              </Typography>

              {driver.documents && driver.documents.length > 0 ? (
                <Stack spacing={1}>
                  {driver.documents.map((doc) => (
                    <Paper key={doc.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DescriptionIcon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {doc.typeDocument}
                            </Typography>
                            {doc.numeroDocument && (
                              <Typography variant="caption" color="text.secondary">
                                N° {doc.numeroDocument}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                        <Box text-align="right">
                          <Chip
                            label={doc.statut}
                            size="small"
                            color={
                              doc.statut === 'VALIDE'
                                ? 'success'
                                : doc.statut === 'BIENTOT_EXPIRE'
                                ? 'warning'
                                : 'error'
                            }
                            variant="outlined"
                          />
                          {doc.dateExpiration && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                              Exp: {new Date(doc.dateExpiration).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Aucun document associé à ce conducteur.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
