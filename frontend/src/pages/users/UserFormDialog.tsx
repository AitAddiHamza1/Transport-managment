import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField } from '@mui/material';
import type { CreateUserPayload, User, UserStatut } from '../../features/users/types';
import { useRoleOptions } from '../../features/roles/useRoles';
import { useAuth } from '../../features/auth/useAuth';
import {
  PROFILE_LABELS,
  PROFILE_PERSONNALISE,
  emptyMatrix,
  type PermissionsMatrix,
} from '../../constants/permissions';
import { PermissionsEditor } from './PermissionsEditor';

const STATUTS: UserStatut[] = ['ACTIF', 'INACTIF', 'SUSPENDU'];

interface UserFormDialogProps {
  open: boolean;
  user?: User | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => void;
}

export function UserFormDialog({ open, user, loading, onClose, onSubmit }: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const { user: currentUser } = useAuth();
  const { data: roles = [] } = useRoleOptions();
  const [permissions, setPermissions] = useState<PermissionsMatrix>(emptyMatrix());

  const isTargetAdminGeneral = isEdit && user && (user.role?.nom === 'ADMIN_GENERAL' || user.role?.nom === 'ADMIN');
  const cannotEditTarget = Boolean(isTargetAdminGeneral && !currentUser?.isAdminGeneral);

  const availableRoles = useMemo(() => {
    if (currentUser?.isAdminGeneral) {
      return roles;
    }
    return roles.filter((r) => r.nom !== 'ADMIN_GENERAL' && r.nom !== 'ADMIN');
  }, [roles, currentUser]);

  const schema = useMemo(
    () =>
      z
        .object({
          nom: z.string().min(1, 'Le nom est requis').max(120),
          telephone: z.string().max(30).optional().or(z.literal('')),
          email: z.string().min(1, 'E-mail requis').email('E-mail invalide'),
          motDePasse: isEdit
            ? z.string().max(72).optional().or(z.literal(''))
            : z.string().min(6, 'Au moins 6 caractères').max(72),
          confirmation: z.string().optional().or(z.literal('')),
          idRole: z.coerce.number().int().min(1, 'Le profil est requis'),
          statut: z.enum(['ACTIF', 'INACTIF', 'SUSPENDU']),
        })
        .refine((v) => !v.motDePasse || v.motDePasse === v.confirmation, {
          message: 'La confirmation ne correspond pas',
          path: ['confirmation'],
        }),
    [isEdit],
  );

  type UserForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      telephone: '',
      email: '',
      motDePasse: '',
      confirmation: '',
      idRole: 0,
      statut: 'ACTIF',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nom: user?.nom ?? '',
        telephone: user?.telephone ?? '',
        email: user?.email ?? '',
        motDePasse: '',
        confirmation: '',
        idRole: user?.idRole ?? 0,
        statut: user?.statut ?? 'ACTIF',
      });
      setPermissions({ ...emptyMatrix(), ...(user?.permissions ?? {}) });
    }
  }, [open, user, reset]);

  const selectedRoleId = watch('idRole');
  const selectedRoleName = roles.find((r) => r.id === Number(selectedRoleId))?.nom;
  const isPersonnalise = selectedRoleName === PROFILE_PERSONNALISE;

  const submit = (values: UserForm) => {
    const payload: CreateUserPayload = {
      nom: values.nom.trim(),
      email: values.email.trim(),
      telephone: values.telephone?.trim() ? values.telephone.trim() : undefined,
      idRole: values.idRole,
      statut: values.statut,
      motDePasse: values.motDePasse ?? '',
    };
    if (isEdit && !values.motDePasse) {
      delete (payload as Partial<CreateUserPayload>).motDePasse;
    }
    if (isPersonnalise) {
      payload.permissions = permissions;
    }
    onSubmit(payload);
  };

  const { ref: nomRef, ...nomField } = register('nom');
  const { ref: telRef, ...telField } = register('telephone');
  const { ref: emailRef, ...emailField } = register('email');
  const { ref: pwdRef, ...pwdField } = register('motDePasse');
  const { ref: confRef, ...confField } = register('confirmation');

  return (
    <Dialog open={open} onClose={onClose} maxWidth={isPersonnalise ? 'md' : 'sm'} fullWidth>
      <DialogTitle>{isEdit ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nom"
              fullWidth
              autoFocus
              error={Boolean(errors.nom)}
              helperText={errors.nom?.message}
              inputRef={nomRef}
              {...nomField}
            />
            <TextField
              label="Téléphone"
              fullWidth
              error={Boolean(errors.telephone)}
              helperText={errors.telephone?.message}
              inputRef={telRef}
              {...telField}
            />
            <TextField
              label="E-mail"
              type="email"
              fullWidth
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              inputRef={emailRef}
              {...emailField}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={isEdit ? 'Mot de passe (vide = inchangé)' : 'Mot de passe'}
                type="password"
                fullWidth
                autoComplete="new-password"
                error={Boolean(errors.motDePasse)}
                helperText={errors.motDePasse?.message}
                inputRef={pwdRef}
                {...pwdField}
              />
              <TextField
                label="Confirmation"
                type="password"
                fullWidth
                autoComplete="new-password"
                error={Boolean(errors.confirmation)}
                helperText={errors.confirmation?.message}
                inputRef={confRef}
                {...confField}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="idRole"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Profil"
                    fullWidth
                    error={Boolean(errors.idRole)}
                    helperText={errors.idRole?.message}
                    {...field}
                    value={field.value || ''}
                  >
                    <MenuItem value="" disabled>
                      — Sélectionner —
                    </MenuItem>
                    {availableRoles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {PROFILE_LABELS[r.nom] ?? r.nom}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="statut"
                control={control}
                render={({ field }) => (
                  <TextField select label="Statut" fullWidth {...field} disabled={cannotEditTarget}>
                    {STATUTS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>

            {cannotEditTarget && (
              <Alert severity="warning">
                Seul un Administrateur Général peut modifier un Administrateur Général.
              </Alert>
            )}

            {isPersonnalise && (
              <>
                <Divider />
                <PermissionsEditor value={permissions} onChange={setPermissions} />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={loading || cannotEditTarget}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
