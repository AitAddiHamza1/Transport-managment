import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';

/** Page générale de la section Véhicules : deux cartes d'accès (aucune API). */
export function VehiclesPage() {
  const navigate = useNavigate();

  const cards = [
    {
      icon: <DescriptionIcon color="primary" />,
      title: 'Liste des véhicules',
      description: 'Consulter tous les véhicules.',
      to: '/vehicules/liste',
    },
    {
      icon: <FolderOpenIcon color="primary" />,
      title: 'Documents véhicules',
      description: 'Consulter les documents.',
      to: '/vehicules/documents',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Gestion des véhicules"
        breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Véhicules' }]}
      />
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid item xs={12} md={6} key={card.to}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  {card.icon}
                  <Typography variant="h6">{card.title}</Typography>
                </Stack>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {card.description}
                </Typography>
                <Button variant="contained" onClick={() => navigate(card.to)}>
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
