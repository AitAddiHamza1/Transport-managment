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
import FolderIcon from '@mui/icons-material/Folder';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useNavigate } from 'react-router-dom';
import { Employe, EmployeStatut } from '../../features/employes/types';
import { useEmployeQuery } from '../../features/employes/useEmployes';
import { employesApi } from '../../features/employes/employesApi';
import { usePaiementsEmployesQuery } from '../../features/paiements-employes/usePaiementsEmployes';
import { Can } from '../../components/shared/Can';

const STATUT_CONFIG: Record<
  EmployeStatut,
  { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' }
> = {
  ACTIF: { label: 'Actif', color: 'success' },
  SUSPENDU: { label: 'Suspendu', color: 'warning' },
  DEMISSIONNAIRE: { label: 'Démissionnaire', color: 'default' },
  LICENCIE: { label: 'Licencié', color: 'error' },
  RETRAITE: { label: 'Retraité', color: 'default' },
  INACTIF: { label: 'Inactif', color: 'error' },
};

interface EmployeDetailDialogProps {
  open: boolean;
  onClose: () => void;
  employeId: number | null;
  onEdit: (employe: Employe) => void;
  onDocuments: (employe: Employe) => void;
}

export function EmployeDetailDialog({
  open,
  onClose,
  employeId,
  onEdit,
  onDocuments,
}: EmployeDetailDialogProps) {
  const navigate = useNavigate();
  const { data: employe, isLoading } = useEmployeQuery(employeId);
  const { data: paiementsData } = usePaiementsEmployesQuery({
    idEmploye: employeId || undefined,
    limit: 5,
  });
  const recentPaiements = paiementsData?.data || [];

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isLoading || !employe ? (
          'Chargement des détails...'
        ) : (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Fiche Employé — {employe.matricule}
            </Typography>
            <Chip
              label={STATUT_CONFIG[employe.statut]?.label || employe.statut}
              color={STATUT_CONFIG[employe.statut]?.color || 'default'}
            />
          </Stack>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {isLoading || !employe ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Header Avatar & Basic Info */}
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                src={employe.hasPhoto ? employesApi.getPhotoUrl(employe.id) : undefined}
                sx={{ width: 90, height: 90, bgcolor: 'primary.main', fontSize: 36 }}
              >
                <PersonIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {employe.prenom} {employe.nom}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {employe.poste} {employe.departement ? `• ${employe.departement}` : ''}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Matricule: <strong>{employe.matricule}</strong> • Embauché le: {employe.dateEmbauche}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            {/* Section 1: Informations Personnelles */}
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1.5 }}>
                INFORMATIONS PERSONNELLES
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    N° CIN
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.cin || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Date de naissance
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.dateNaissance || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Téléphone
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.telephone || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.email || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Adresse
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.adresse || '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Section 2: Informations Professionnelles */}
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1.5 }}>
                INFORMATIONS PROFESSIONNELLES
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Type de contrat
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.typeContrat}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Département
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.departement || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Date d’embauche
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.dateEmbauche}
                  </Typography>
                </Grid>

                {employe.dateSortie && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Date de sortie
                      </Typography>
                      <Typography variant="body1" color="error.main" fontWeight={600}>
                        {employe.dateSortie}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Motif de sortie
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {employe.motifSortie || '—'}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>

            <Divider />

            {/* Section 3: Informations Financières & Bancaires */}
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1.5 }}>
                INFORMATIONS FINANCIÈRES ET BANCAIRES
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Salaire de base (MAD)
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="success.dark">
                    {employe.salaireBase !== null
                      ? `${employe.salaireBase.toLocaleString('fr-FR')} MAD`
                      : 'Non configuré'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Mode de paiement
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.modePaiement || 'Non configuré'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Nom de la banque
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employe.nomBanque || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    RIB (Relevé d’Identité Bancaire)
                  </Typography>
                  <Typography variant="body1" fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                    {employe.rib || '—'}
                  </Typography>
                </Grid>

                {employe.observations && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Observations
                    </Typography>
                    <Typography variant="body2">{employe.observations}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Divider />

            {/* Section 4: Historique récapitulatif des paiements de salaire */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
                  HISTORIQUE RÉCAPITULATIF DES PAIEMENTS ({recentPaiements.length})
                </Typography>
                <Can module="paiements_employes" action="voir">
                  <Button
                    size="small"
                    startIcon={<PaymentsIcon />}
                    onClick={() => {
                      onClose();
                      navigate(`/paiements-employes?idEmploye=${employe.id}`);
                    }}
                  >
                    Voir tout dans Paiements employés
                  </Button>
                </Can>
              </Stack>

              {recentPaiements.length > 0 ? (
                <Stack spacing={1}>
                  {recentPaiements.map((p) => (
                    <Paper
                      key={p.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {p.numeroPaiement} — Période {p.periode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Dû: {p.montantDu.toLocaleString('fr-FR')} MAD • Payé: {p.montantPaye.toLocaleString('fr-FR')} MAD • Solde: {p.soldeRestant.toLocaleString('fr-FR')} MAD
                        </Typography>
                      </Box>
                      <Chip
                        label={p.statut === 'EN_ATTENTE' ? 'En attente' : p.statut === 'PARTIELLEMENT_PAYE' ? 'Partiel' : 'Payé'}
                        color={p.statut === 'PAYE' ? 'success' : p.statut === 'PARTIELLEMENT_PAYE' ? 'warning' : 'default'}
                        size="small"
                      />
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Aucun engagement de salaire enregistré pour cet employé.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          Fermer
        </Button>
        {employe && (
          <Stack direction="row" spacing={1}>
            <Can module="employes" action="modifier">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FolderIcon />}
                onClick={() => {
                  onClose();
                  onDocuments(employe);
                }}
              >
                Gérer les documents
              </Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<EditIcon />}
                onClick={() => {
                  onClose();
                  onEdit(employe);
                }}
              >
                Modifier
              </Button>
            </Can>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
}
