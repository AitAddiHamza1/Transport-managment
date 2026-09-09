import { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { platformApi } from '../../lib/platformApi';
import { getApiErrorMessage } from '../../lib/axios';
import { notify } from '../../utils/notify';

interface UpdateCompanyStatusDialogProps {
  open: boolean;
  company: { id: number; nom: string; statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF' } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateCompanyStatusDialog({
  open,
  company,
  onClose,
  onSuccess,
}: UpdateCompanyStatusDialogProps) {
  const [targetStatus, setTargetStatus] = useState<'ACTIF' | 'SUSPENDU' | 'INACTIF'>('ACTIF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setTargetStatus(company.statut);
      setError(null);
    }
  }, [company]);

  if (!company) return null;

  const currentStatus = company.statut;

  // Determine valid target status options according to rules:
  // ACTIF -> SUSPENDU, INACTIF
  // SUSPENDU -> ACTIF
  // INACTIF -> ACTIF
  const allowedOptions: { label: string; value: 'ACTIF' | 'SUSPENDU' | 'INACTIF' }[] = [];

  if (currentStatus === 'ACTIF') {
    allowedOptions.push({ label: 'ACTIF (Actuel)', value: 'ACTIF' });
    allowedOptions.push({ label: 'SUSPENDU (Suspendre temporairement l’accès)', value: 'SUSPENDU' });
    allowedOptions.push({ label: 'INACTIF (Désactiver définitivement)', value: 'INACTIF' });
  } else if (currentStatus === 'SUSPENDU') {
    allowedOptions.push({ label: 'SUSPENDU (Actuel)', value: 'SUSPENDU' });
    allowedOptions.push({ label: 'ACTIF (Réactiver l’accès entreprise)', value: 'ACTIF' });
  } else if (currentStatus === 'INACTIF') {
    allowedOptions.push({ label: 'INACTIF (Actuel)', value: 'INACTIF' });
    allowedOptions.push({ label: 'ACTIF (Réactiver l’accès entreprise)', value: 'ACTIF' });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetStatus === currentStatus) {
      onClose();
      return;
    }

    setLoading(true);

    try {
      await platformApi.patch(`/platform/companies/${company.id}/status`, {
        statut: targetStatus,
      });

      notify.success(`Statut de l'entreprise mis à jour avec succès : ${targetStatus}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Échec de la modification du statut'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1e293b', color: '#f8fafc', border: '1px solid #334155' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #334155', fontWeight: 700 }}>
        Changer le statut de l'entreprise
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
              {error}
            </Alert>
          )}

          <Typography variant="body1" sx={{ mb: 2, color: '#f8fafc' }}>
            Entreprise : <strong>{company.nom}</strong> (# {company.id})
          </Typography>

          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="status-select-label" sx={{ color: '#94a3b8' }}>
              Nouveau statut
            </InputLabel>
            <Select
              labelId="status-select-label"
              value={targetStatus}
              label="Nouveau statut"
              onChange={(e) => setTargetStatus(e.target.value as any)}
              sx={{
                color: '#f8fafc',
                bgcolor: '#0f172a',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              }}
            >
              {allowedOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid #334155', pt: 2 }}>
          <Button onClick={onClose} sx={{ color: '#94a3b8' }}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || targetStatus === currentStatus}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
