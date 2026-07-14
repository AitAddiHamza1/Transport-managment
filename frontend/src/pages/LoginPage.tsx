import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useState } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useLogin } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/axios';
import { notify } from '../utils/notify';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail requis').email('E-mail invalide'),
  password: z.string().min(6, 'Au moins 6 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // MUI TextField : la ref de react-hook-form doit cibler l'input (inputRef).
  const { ref: emailRef, ...emailField } = register('email');
  const { ref: passwordRef, ...passwordField } = register('password');

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const onSubmit = (values: LoginForm) => {
    setServerError(null);
    login.mutate(values, {
      onSuccess: () => {
        notify.success('Connexion réussie.');
        navigate(from, { replace: true });
      },
      onError: (error) => {
        setServerError(getApiErrorMessage(error, 'Identifiants invalides'));
      },
    });
  };

  return (
    <AuthLayout>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        <TextField
          label="E-mail"
          type="email"
          fullWidth
          margin="normal"
          autoComplete="email"
          autoFocus
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          inputRef={emailRef}
          {...emailField}
        />
        <TextField
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          autoComplete="current-password"
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
          inputRef={passwordRef}
          {...passwordField}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={login.isPending}
          sx={{ mt: 3 }}
          startIcon={login.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {login.isPending ? 'Connexion…' : 'Se connecter'}
        </Button>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="text" size="small" onClick={() => navigate('/register')}>
            Pas encore de compte ? S'inscrire
          </Button>
        </Box>
      </Box>
    </AuthLayout>
  );
}
