import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { platformApi } from '../../lib/platformApi';
import { platformTokenStorage } from '../../utils/platformTokenStorage';
import { getApiErrorMessage } from '../../lib/axios';

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await platformApi.post('/platform/auth/login', {
        email: email.trim(),
        password,
      });

      const { accessToken, refreshToken, user } = response.data;
      platformTokenStorage.setTokens(accessToken, refreshToken);

      if (user.mustChangePassword) {
        navigate('/platform-admin/change-password', { replace: true });
      } else {
        navigate('/platform-admin/companies', { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Identifiants invalides ou compte inactif'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          bgcolor: '#1e293b',
          color: '#f8fafc',
          borderRadius: 3,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 56, color: '#38bdf8', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              Administration Plateforme
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
              Portail de gestion SaaS & Entreprises
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Adresse e-mail"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiInputBase-root': { color: '#f8fafc', bgcolor: '#0f172a' },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      sx={{ color: '#94a3b8' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiInputBase-root': { color: '#f8fafc', bgcolor: '#0f172a' },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                bgcolor: '#0284c7',
                fontWeight: 600,
                fontSize: '1rem',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Se connecter'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
