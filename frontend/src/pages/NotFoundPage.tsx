import { Box, Button, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useNavigate } from 'react-router-dom';

/** Page 404 — ressource introuvable. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textAlign: 'center',
        p: 2,
      }}
    >
      <SearchOffIcon color="disabled" sx={{ fontSize: 72 }} />
      <Typography variant="h4">404 — Page introuvable</Typography>
      <Typography color="text.secondary">La page demandée n’existe pas.</Typography>
      <Button variant="contained" onClick={() => navigate('/app')}>
        Retour à l’accueil
      </Button>
    </Box>
  );
}
