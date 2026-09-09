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
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { platformApi } from '../../lib/platformApi';
import { getApiErrorMessage } from '../../lib/axios';
import { notify } from '../../utils/notify';

export function PlatformChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      await platformApi.post('/platform/auth/change-password', {
        currentPassword,
        newPassword,
      });

      notify.success('Mot de passe modifié avec succès !');
      navigate('/platform-admin/companies', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Échec de la modification du mot de passe'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 450,
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
            <LockResetIcon sx={{ fontSize: 56, color: '#eab308', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', color: '#f8fafc' }}>
              Changement de mot de passe obligatoire
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1, textAlign: 'center' }}>
              Veuillez définir un nouveau mot de passe personnel pour sécuriser votre compte administrateur.
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
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
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
              label="Nouveau mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              label="Confirmer le nouveau mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Enregistrer le nouveau mot de passe'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
