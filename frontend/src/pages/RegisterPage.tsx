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
import { useState } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useRegister } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/axios';
import { notify } from '../utils/notify';

const registerSchema = z
  .object({
    nom: z.string().min(1, 'Nom complet requis').max(120, '120 caractères maximum'),
    email: z.string().min(1, 'E-mail requis').email('E-mail invalide'),
    password: z.string().min(6, 'Au moins 6 caractères'),
    confirmPassword: z.string().min(1, 'Veuillez confirmer le mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nom: '', email: '', password: '', confirmPassword: '' },
  });

  const { ref: nomRef, ...nomField } = register('nom');
  const { ref: emailRef, ...emailField } = register('email');
  const { ref: passwordRef, ...passwordField } = register('password');
  const { ref: confirmPasswordRef, ...confirmPasswordField } = register('confirmPassword');

  const onSubmit = (values: RegisterForm) => {
    setServerError(null);
    registerMutation.mutate(
      {
        nom: values.nom,
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          notify.success('Inscription réussie. Veuillez vous connecter.');
          navigate('/login');
        },
        onError: (error) => {
          setServerError(getApiErrorMessage(error, 'Une erreur est survenue lors de l’inscription.'));
        },
      },
    );
  };

  return (
    <AuthLayout>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 'medium' }}>
          Créer un compte
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <TextField
          label="Nom complet"
          type="text"
          fullWidth
          margin="normal"
          autoFocus
          error={Boolean(errors.nom)}
          helperText={errors.nom?.message}
          inputRef={nomRef}
          {...nomField}
        />

        <TextField
          label="E-mail"
          type="email"
          fullWidth
          margin="normal"
          autoComplete="email"
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
          autoComplete="new-password"
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

        <TextField
          label="Confirmer le mot de passe"
          type={showConfirmPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          autoComplete="new-password"
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
          inputRef={confirmPasswordRef}
          {...confirmPasswordField}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowConfirmPassword((v) => !v)} edge="end" tabIndex={-1}>
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
          disabled={registerMutation.isPending}
          sx={{ mt: 3 }}
          startIcon={registerMutation.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {registerMutation.isPending ? 'Inscription…' : 'S’inscrire'}
        </Button>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="text" size="small" onClick={() => navigate('/login')}>
            Déjà un compte ? Se connecter
          </Button>
        </Box>
      </Box>
    </AuthLayout>
  );
}
