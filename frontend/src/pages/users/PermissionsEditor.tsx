import {
  Box,
  Button,
  Checkbox,
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
import {
  ACTION_LABELS,
  MODULES,
  PERMISSION_ACTIONS,
  emptyMatrix,
  emptyModulePermission,
  fullMatrix,
  type ModulePermission,
  type PermissionAction,
  type PermissionsMatrix,
} from '../../constants/permissions';

interface PermissionsEditorProps {
  value: PermissionsMatrix;
  onChange: (matrix: PermissionsMatrix) => void;
}

/**
 * Éditeur de permissions (profil « Personnalisé » / rôles sur mesure).
 * Seules les capacités non supportées (ex: `valider` sur un module sans validation) sont marquées d'un « — ».
 * Décocher « Voir » désactive et réinitialise les actions secondaires du module.
 */
export function PermissionsEditor({ value, onChange }: PermissionsEditorProps) {
  const handleChange = (moduleKey: string, action: PermissionAction, checked: boolean) => {
    const current = value[moduleKey] ?? emptyModulePermission();
    let next: ModulePermission;
    if (action === 'voir') {
      next = checked ? { ...current, voir: true } : emptyModulePermission();
    } else {
      next = { ...current, [action]: checked };
      if (checked) next.voir = true;
    }
    onChange({ ...value, [moduleKey]: next });
  };

  const handleCheckAllView = () => {
    const matrix = fullMatrix();
    onChange(matrix);
  };

  const handleUncheckAll = () => {
    onChange(emptyMatrix());
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Permissions granulaires par module
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={handleCheckAllView}>
            Tout autoriser
          </Button>
          <Button size="small" variant="outlined" color="inherit" onClick={handleUncheckAll}>
            Tout réinitialiser
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 380, overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Module</TableCell>
              {PERMISSION_ACTIONS.map((action) => (
                <TableCell key={action} align="center" sx={{ fontWeight: 600 }}>
                  {ACTION_LABELS[action]}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {MODULES.map((mod) => {
              const perm = value[mod.key] ?? emptyModulePermission();
              return (
                <TableRow key={mod.key} hover>
                  <TableCell sx={{ py: 0.75 }}>{mod.label}</TableCell>
                  {PERMISSION_ACTIONS.map((action) => {
                    const isVoir = action === 'voir';
                    const notSupported = action === 'valider' && !mod.valider;
                    const disabled = notSupported || (!isVoir && !perm.voir);
                    return (
                      <TableCell key={action} align="center" padding="checkbox">
                        {notSupported ? (
                          <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
                            —
                          </Box>
                        ) : (
                          <Checkbox
                            size="small"
                            checked={Boolean(perm[action])}
                            disabled={disabled}
                            onChange={(e) => handleChange(mod.key, action, e.target.checked)}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
