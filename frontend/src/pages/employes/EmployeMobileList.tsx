import {
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { Employe, EmployeStatut } from '../../features/employes/types';
import { employesApi } from '../../features/employes/employesApi';
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

interface EmployeMobileListProps {
  employes: Employe[];
  onView: (employe: Employe) => void;
  onEdit: (employe: Employe) => void;
  onDocuments: (employe: Employe) => void;
  onDelete: (employe: Employe) => void;
}

export function EmployeMobileList({
  employes,
  onView,
  onEdit,
  onDocuments,
  onDelete,
}: EmployeMobileListProps) {
  if (employes.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Aucun employé trouvé.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {employes.map((emp) => {
        const statusCfg = STATUT_CONFIG[emp.statut] || { label: emp.statut, color: 'default' };
        return (
          <Card key={emp.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <Avatar
                  src={emp.hasPhoto ? employesApi.getPhotoUrl(emp.id) : undefined}
                  sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}
                >
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={600} noWrap>
                    {emp.prenom} {emp.nom}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Matricule: {emp.matricule} • {emp.poste}
                  </Typography>
                  {emp.cin && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      CIN: {emp.cin}
                    </Typography>
                  )}
                </Box>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
              </Stack>

              <Stack spacing={0.5} sx={{ mt: 1, pt: 1, borderTop: '1px dashed #e0e0e0' }}>
                {emp.departement && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Département:</strong> {emp.departement}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Contrat:</strong> {emp.typeContrat}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date embauche:</strong> {emp.dateEmbauche}
                </Typography>
                {emp.salaireBase !== null && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Salaire de base:</strong> {emp.salaireBase.toLocaleString('fr-FR')} MAD
                  </Typography>
                )}
              </Stack>
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', bg: '#f9f9f9', px: 2, py: 1 }}>
              <Tooltip title="Détails">
                <IconButton size="small" onClick={() => onView(emp)} color="info">
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Can module="employes" action="modifier">
                <Tooltip title="Documents">
                  <IconButton size="small" onClick={() => onDocuments(emp)} color="primary">
                    <FolderIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Modifier">
                  <IconButton size="small" onClick={() => onEdit(emp)} color="warning">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Can>

              <Can module="employes" action="supprimer">
                <Tooltip title="Supprimer">
                  <IconButton size="small" onClick={() => onDelete(emp)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Can>
            </CardActions>
          </Card>
        );
      })}
    </Stack>
  );
}
