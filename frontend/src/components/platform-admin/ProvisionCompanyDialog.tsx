import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { platformApi } from '../../lib/platformApi';
import { getApiErrorMessage } from '../../lib/axios';
import { notify } from '../../utils/notify';

interface ProvisionCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProvisionCompanyDialog({ open, onClose, onSuccess }: ProvisionCompanyDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provisionResult, setProvisionResult] = useState<{
    company: { id: number; nom: string; statut: string };
    admin: { id: number; nom: string; email: string };
    temporaryPassword: string;
  } | null>(null);

  const handleReset = () => {
    setCompanyName('');
    setAdminName('');
    setAdminEmail('');
    setError(null);
    setLoading(false);
    setProvisionResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      setError('Tous les champs sont requis');
      return;
    }

    setLoading(true);

    try {
      const response = await platformApi.post('/platform/companies', {
        companyName: companyName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      });

      setProvisionResult(response.data);
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Échec du provisionnement de l’entreprise'));
    } finally {
      setLoading(false);
    }
  };

  const copyPasswordToClipboard = () => {
    if (provisionResult?.temporaryPassword) {
      navigator.clipboard.writeText(provisionResult.temporaryPassword);
      notify.success('Mot de passe temporaire copié dans le presse-papier !');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1e293b', color: '#f8fafc', border: '1px solid #334155' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #334155', fontWeight: 700 }}>
        {provisionResult ? 'Entreprise Provisionnée avec Succès' : 'Provisionner une Nouvelle Entreprise'}
      </DialogTitle>

      {provisionResult ? (
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: '#22c55e', mb: 1 }} />
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>
              {provisionResult.company.nom}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Compte créé et initialisé avec succès
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 3, bgcolor: 'rgba(234, 179, 8, 0.1)', color: '#fde047' }}>
            Attention : Le mot de passe temporaire ci-dessous est affiché <strong>UNE SEULE FOIS</strong>. Veuillez le transmettre de manière sécurisée à l'administrateur.
          </Alert>

          <Box sx={{ bgcolor: '#0f172a', p: 2, borderRadius: 2, border: '1px solid #334155', mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mot de passe temporaire (À transmettre à {provisionResult.admin.email})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                {provisionResult.temporaryPassword}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={copyPasswordToClipboard}
                sx={{ color: '#38bdf8', borderColor: '#38bdf8', '&:hover': { borderColor: '#7dd3fc', bgcolor: 'rgba(56, 189, 248, 0.1)' } }}
              >
                Copier
              </Button>
            </Box>
          </Box>
        </DialogContent>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                {error}
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              label="Nom de l'entreprise"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
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
              label="Nom de l'administrateur général"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
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
              type="email"
              label="Adresse e-mail de l'administrateur général"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiInputBase-root': { color: '#f8fafc', bgcolor: '#0f172a' },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              }}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid #334155', pt: 2 }}>
            <Button onClick={handleClose} sx={{ color: '#94a3b8' }}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Provisionner'}
            </Button>
          </DialogActions>
        </Box>
      )}

      {provisionResult && (
        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid #334155', pt: 2 }}>
          <Button onClick={handleClose} variant="contained" sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}>
            Fermer
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
