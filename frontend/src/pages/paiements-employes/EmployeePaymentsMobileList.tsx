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
import AddIcon from '@mui/icons-material/Add';
import { Can } from '../../components/shared/Can';
import type { PaiementEmployeView, StatutPaiementEmployeUnion } from '../../features/paiements-employes/types';
import { useCompanySettings } from '../../features/company-settings/useCompanySettings';
import { formatPeriodeFr } from './utils';

interface EmployeePaymentsMobileListProps {
  paiements: PaiementEmployeView[];
  onView: (paiement: PaiementEmployeView) => void;
  onAddVersement: (paiement: PaiementEmployeView) => void;
}

const STATUT_CONFIG: Record<
  StatutPaiementEmployeUnion,
  { label: string; color: 'default' | 'warning' | 'success' }
> = {
  EN_ATTENTE: { label: 'En attente', color: 'default' },
  PARTIELLEMENT_PAYE: { label: 'Partiellement payé', color: 'warning' },
  PAYE: { label: 'Payé', color: 'success' },
};

export function EmployeePaymentsMobileList({
  paiements,
  onView,
  onAddVersement,
}: EmployeePaymentsMobileListProps) {
  const { settings } = useCompanySettings();
  const currency = settings?.devise || 'MAD';

  if (!paiements || paiements.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {paiements.map((p) => {
        const statutInfo = STATUT_CONFIG[p.statut] || { label: p.statut, color: 'default' };
        const empName = p.employe ? `${p.employe.nom} ${p.employe.prenom}` : `Employé #${p.idEmploye}`;

        return (
          <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                    {p.numeroPaiement}
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ mt: 0.25 }}>
                    {empName}
                  </Typography>
                  {p.employe?.matricule && (
                    <Typography variant="caption" color="text.secondary">
                      Matricule: {p.employe.matricule}
                    </Typography>
                  )}
                </Box>
                <Chip label={statutInfo.label} color={statutInfo.color} size="small" />
              </Stack>

              <Stack spacing={0.75} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5, mb: 1.5 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Période:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatPeriodeFr(p.periode)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Montant dû:
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {p.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Déjà payé:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">
                    {p.montantPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Solde restant:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color={p.soldeRestant > 0 ? 'warning.main' : 'text.primary'}>
                    {p.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Dernier versement: {p.latestVersementDate || 'Aucun'}
                </Typography>

                <Stack direction="row" spacing={0.5}>
                  <Can module="paiements_employes" action="ajouter">
                    {p.soldeRestant > 0 && (
                      <Tooltip title="Ajouter un versement">
                        <IconButton size="small" color="primary" onClick={() => onAddVersement(p)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Can>
                  <Tooltip title="Voir détails">
                    <IconButton size="small" color="info" onClick={() => onView(p)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
