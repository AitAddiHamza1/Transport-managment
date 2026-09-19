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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Can, StatusChip } from '../../components/shared';
import { StockGasoilMovementView } from '../../features/stock-gasoil/types';

interface StockGasoilMobileListProps {
  movements: StockGasoilMovementView[];
  onEdit: (movement: StockGasoilMovementView) => void;
  onDelete: (movement: StockGasoilMovementView) => void;
}

export function StockGasoilMobileList({
  movements,
  onEdit,
  onDelete,
}: StockGasoilMobileListProps) {
  if (movements.length === 0) return null;

  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
      {movements.map((m) => {
        const isEntree = m.typeMouvement === 'ENTREE';

        return (
          <Card key={m.idMouvement} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusChip
                    label={isEntree ? 'ENTRÉE' : 'SORTIE'}
                    variant={isEntree ? 'success' : 'info'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {m.dateMouvement.split('T')[0]}
                  </Typography>
                </Stack>

                {isEntree && (
                  <Stack direction="row" spacing={0.5}>
                    <Can module="stock_gasoil" action="modifier">
                      <IconButton size="small" color="primary" onClick={() => onEdit(m)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Can>
                    <Can module="stock_gasoil" action="supprimer">
                      <IconButton size="small" color="error" onClick={() => onDelete(m)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Can>
                  </Stack>
                )}
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" my={1}>
                <Box>
                  <Typography variant="h6" fontWeight={700} color={isEntree ? 'success.main' : 'info.main'}>
                    {isEntree ? `+${Number(m.quantiteLitres).toLocaleString('fr-FR')} L` : `-${Number(m.quantiteLitres).toLocaleString('fr-FR')} L`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PMP / Prix : {m.prixUnitaire ? `${Number(m.prixUnitaire).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MAD/L` : '—'}
                  </Typography>
                </Box>
                <Box text-align="right">
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    {m.montantTotal ? `${Number(m.montantTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stock après : {Number(m.stockApresMouvement).toLocaleString('fr-FR')} L
                  </Typography>
                </Box>
              </Stack>

              {/* Context info */}
              <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider', mt: 1 }}>
                {isEntree ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Fournisseur : <strong>{m.nomFournisseur || '—'}</strong>
                    {m.referenceFacture ? ` (Réf: ${m.referenceFacture})` : ''}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Bon : <strong>{m.numeroBon ? `#${m.numeroBon}` : `#${m.idBonCarburant}`}</strong> | Veh : <strong>{m.immatriculation || '—'}</strong> | Chauffeur : <strong>{m.nomConducteur || '—'}</strong>
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
