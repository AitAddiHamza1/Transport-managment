import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import type { Role } from '../../features/roles/types';
import {
  PROFILE_LABELS,
  PROFILE_PERSONNALISE,
  getRoleEffectivePermissions,
} from '../../constants/permissions';
import { PermissionsEditor } from './PermissionsEditor';

interface RoleDetailsDialogProps {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onFilterUsers?: (roleId: number) => void;
}

/**
 * Dialogue de consultation détaillée d’un rôle et de ses permissions (Option B).
 *
 * Rôles système : affiche la matrice de permissions effectives fixes (lecture seule).
 * Rôle PERSONNALISE : explique la gestion granulaire au niveau utilisateur.
 * Rôles sur mesure (Option B) : explique que le rôle est un libellé organisationnel
 * et que chaque utilisateur rattaché dispose de ses propres permissions individuelles.
 */
export function RoleDetailsDialog({
  open,
  role,
  onClose,
  onFilterUsers,
}: RoleDetailsDialogProps) {
  if (!role) return null;

  const displayName = PROFILE_LABELS[role.nom] ?? role.nom;
  const isPersonnalise = role.nom === PROFILE_PERSONNALISE;
  const isPredefinedSystemRole = role.isSystem && !isPersonnalise;
  const isCustomRole = !role.isSystem;

  const handleFilterUsers = () => {
    if (onFilterUsers) {
      onFilterUsers(role.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={isPredefinedSystemRole ? 'md' : 'sm'} fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Identifiant rôle : #{role.id}
            </Typography>
          </Box>
          {role.isSystem ? (
            <Chip
              size="small"
              icon={<SecurityIcon fontSize="small" />}
              label="Système"
              color="primary"
              variant="outlined"
            />
          ) : (
            <Chip size="small" label="Sur mesure" color="default" />
          )}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Bloc descriptif & métadonnées */}
          <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {role.description ?? 'Aucune description fournie pour ce rôle.'}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
              <PeopleIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>
                {role.userCount} utilisateur{role.userCount > 1 ? 's' : ''} associé{role.userCount > 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Box>

          {/* Section Permissions selon la catégorie de rôle */}
          {isPredefinedSystemRole && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Rôle système prédéfini :</strong> ce profil dispose d’un jeu fixe de permissions standards communes à tous les comptes utilisateurs qui lui sont associés.
              </Alert>

              <PermissionsEditor
                value={getRoleEffectivePermissions(role.nom)}
                readOnly
              />
            </Box>
          )}

          {isPersonnalise && (
            <Alert severity="info">
              <strong>Profil système personnalisable :</strong> ce profil ne possède pas de permissions partagées prédéfinies. Les accès sont configurés individuellement pour chaque collaborateur sur sa fiche utilisateur.
            </Alert>
          )}

          {isCustomRole && (
            <Stack spacing={1.5}>
              <Alert severity="info">
                <strong>Rôle sur mesure (Organisationnel — Option B) :</strong> ce rôle sert d’intitulé de poste et de regroupement métier pour votre entreprise.
              </Alert>
              <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Conformément au modèle de sécurité de l’ERP (Option B), les permissions ne sont pas portées collectivement par le rôle sur mesure, mais sont définies et enregistrées <strong>au cas par cas pour chaque utilisateur</strong> lors de sa création ou modification dans l’onglet « Utilisateurs ».
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {role.userCount > 0 && onFilterUsers && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={handleFilterUsers}
            >
              Voir les utilisateurs ({role.userCount})
            </Button>
          )}
        </Box>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
