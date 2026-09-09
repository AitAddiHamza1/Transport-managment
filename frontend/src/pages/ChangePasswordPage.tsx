import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useChangePassword } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/axios';
import { notify } from '../utils/notify';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: z.string().min(6, 'Au moins 6 caractères'),
    confirmPassword: z.string().min(6, 'Au moins 6 caractères'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Le nouveau mot de passe doit être différent du mot de passe actuel',
    path: ['newPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const { ref: currentRef, ...currentField } = register('currentPassword');
  const { ref: newRef, ...newField } = register('newPassword');
  const { ref: confirmRef, ...confirmField } = register('confirmPassword');

  const onSubmit = (values: ChangePasswordForm) => {
    setServerError(null);
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          notify.success('Votre mot de passe a été modifié avec succès.');
          navigate('/', { replace: true });
        },
        onError: (error) => {
          setServerError(getApiErrorMessage(error, 'Échec de la modification du mot de passe'));
        },
      },
    );
  };

  return (
    <AuthLayout>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <LockResetIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Changement de mot de passe
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pour la sécurité de votre compte, vous devez définir un nouveau mot de passe lors de votre première connexion.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <TextField
          label="Mot de passe temporaire / actuel"
          type={showCurrentPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          autoFocus
          error={Boolean(errors.currentPassword)}
          helperText={errors.currentPassword?.message}
          inputRef={currentRef}
          {...currentField}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowCurrentPassword((v) => !v)} edge="end" tabIndex={-1}>
                  {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Nouveau mot de passe"
          type={showNewPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          error={Boolean(errors.newPassword)}
          helperText={errors.newPassword?.message}
          inputRef={newRef}
          {...newField}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNewPassword((v) => !v)} edge="end" tabIndex={-1}>
                  {showNewPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Confirmer le nouveau mot de passe"
          type={showNewPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
          inputRef={confirmRef}
          {...confirmField}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={changePassword.isPending}
          sx={{ mt: 3, mb: 2 }}
          startIcon={changePassword.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {changePassword.isPending ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
        </Button>
      </Box>
    </AuthLayout>
  );
}
