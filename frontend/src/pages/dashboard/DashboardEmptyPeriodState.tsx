import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';

export const DashboardEmptyPeriodState: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: '1px border',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        textAlign: 'center',
      }}
    >
      <Box display="flex" justifyContent="center" alignItems="center" mb={1.5}>
        <InfoOutlinedIcon color="action" sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Aucune activité enregistrée pour cette période.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxW: 500, mx: 'auto', mb: 2 }}>
        Les indicateurs de la période sélectionnée ne contiennent aucun mouvement. Vous pouvez enregistrer une nouvelle opération ou modifier la période d'analyse.
      </Typography>

      <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" gap={1}>
        {can('voyages', 'ajouter') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/voyages')}
          >
            Créer un voyage
          </Button>
        )}
        {can('factures', 'ajouter') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/factures')}
          >
            Créer une facture
          </Button>
        )}
        {can('paiements_clients', 'ajouter') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/paiements-clients')}
          >
            Enregistrer un paiement
          </Button>
        )}
        {can('depenses_administratives', 'ajouter') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/charges-administratives')}
          >
            Ajouter une charge
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
