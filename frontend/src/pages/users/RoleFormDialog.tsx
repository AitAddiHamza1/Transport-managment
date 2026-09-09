import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import type { Role, RolePayload } from '../../features/roles/types';

const RESERVED_NAMES = [
  'ADMIN_GENERAL',
  'ADMINISTRATEUR',
  'EXPLOITANT',
  'COMPTABLE',
  'CHAUFFEUR',
  'PERSONNALISE',
  'ADMIN',
  'GESTIONNAIRE',
  'OPERATEUR',
  'CONDUCTEUR',
];

interface RoleFormDialogProps {
  open: boolean;
  role?: Role | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: RolePayload) => void;
}

export function RoleFormDialog({
  open,
  role,
  loading,
  onClose,
  onSubmit,
}: RoleFormDialogProps) {
  const isEdit = Boolean(role);

  const schema = useMemo(
    () =>
      z.object({
        nom: z
          .string()
          .min(1, 'Le nom du rôle est requis')
          .max(50, '50 caractères maximum')
          .refine(
            (val) => !RESERVED_NAMES.includes(val.trim().toUpperCase()),
            'Ce nom de rôle est réservé au système',
          ),
        description: z.string().max(255, '255 caractères maximum').optional().or(z.literal('')),
      }),
    [],
  );

  type RoleForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleForm>({
    resolver: zodResolver(schema),
    defaultValues: { nom: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        nom: role?.nom ?? '',
        description: role?.description ?? '',
      });
    }
  }, [open, role, reset]);

  const submit = (values: RoleForm) => {
    onSubmit({
      nom: values.nom.trim(),
      description: values.description?.trim() || undefined,
    });
  };

  const { ref: nomRef, ...nomField } = register('nom');
  const { ref: descRef, ...descField } = register('description');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Modifier le rôle' : 'Nouveau rôle sur mesure'}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nom du rôle"
              fullWidth
              autoFocus
              disabled={isEdit && role?.isSystem}
              error={Boolean(errors.nom)}
              helperText={errors.nom?.message}
              inputRef={nomRef}
              {...nomField}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              inputRef={descRef}
              {...descField}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
