import React from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { notify } from '../../utils/notify';

interface ChequeFormFieldsProps {
  numero: string;
  setNumero: (val: string) => void;
  serie: string;
  setSerie: (val: string) => void;
  dateCheque: string;
  setDateCheque: (val: string) => void;
  banque: string;
  setBanque: (val: string) => void;
  agence: string;
  setAgence: (val: string) => void;
  beneficiaire: string;
  setBeneficiaire: (val: string) => void;
  ville: string;
  setVille: (val: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
}

export const ChequeFormFields: React.FC<ChequeFormFieldsProps> = ({
  numero,
  setNumero,
  serie,
  setSerie,
  dateCheque,
  setDateCheque,
  banque,
  setBanque,
  agence,
  setAgence,
  beneficiaire,
  setBeneficiaire,
  ville,
  setVille,
  selectedFile,
  setSelectedFile,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      notify.error(`Fichier "${file.name}" rejeté. Formats acceptés : PDF, JPEG, PNG, WEBP`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(`Fichier "${file.name}" trop volumineux (max 5 Mo)`);
      return;
    }

    setSelectedFile(file);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: 'primary.light', bgcolor: 'background.paper' }}>
      <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Informations — Chèque
      </Typography>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="N° du chèque *"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            fullWidth
            size="small"
            required
            placeholder="Ex: CHQ-001234"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Série"
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            fullWidth
            size="small"
            placeholder="Ex: A77"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Date du chèque *"
            type="date"
            value={dateCheque}
            onChange={(e) => setDateCheque(e.target.value)}
            fullWidth
            size="small"
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Banque *"
            value={banque}
            onChange={(e) => setBanque(e.target.value)}
            fullWidth
            size="small"
            required
            placeholder="Ex: Attijariwafa Bank"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Agence"
            value={agence}
            onChange={(e) => setAgence(e.target.value)}
            fullWidth
            size="small"
            placeholder="Ex: Agence Principale"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Bénéficiaire *"
            value={beneficiaire}
            onChange={(e) => setBeneficiaire(e.target.value)}
            fullWidth
            size="small"
            required
            placeholder="Ex: Nom de la société / bénéficiaire"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            fullWidth
            size="small"
            placeholder="Ex: Casablanca"
          />
        </Grid>

        {/* Scan / Document upload section */}
        <Grid item xs={12}>
          <Box sx={{ mt: 1, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Document du chèque (Optionnel)
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Formats autorisés : PDF, JPEG, PNG, WEBP — Taille max : 5 Mo
            </Typography>

            {selectedFile ? (
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, border: '1px solid', borderColor: 'success.light', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AttachFileIcon color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedFile.size / 1024).toFixed(0)} Ko
                    </Typography>
                  </Box>
                </Stack>
                <IconButton size="small" color="error" onClick={() => setSelectedFile(null)} title="Retirer le fichier">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<CloudUploadIcon />}
              >
                Choisir un fichier
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpeg,.jpg,.png,.webp"
                  onChange={handleFileChange}
                />
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};
