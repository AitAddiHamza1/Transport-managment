import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import { useConducteurStats } from '../../features/conducteurs/useConducteurs';

export function ConducteursPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useConducteurStats();

  const cards = [
    {
      icon: <AssignmentIndIcon color="primary" fontSize="large" />,
      title: 'Liste des conducteurs',
      description: 'Consulter, ajouter, modifier et gérer les conducteurs et leurs affectations.',
      to: '/conducteurs/liste',
    },
    {
      icon: <FolderOpenIcon color="primary" fontSize="large" />,
      title: 'Documents conducteurs',
      description: 'Consulter les passeports, visas, permis de conduire et cartes de santé.',
      to: '/conducteurs/documents',
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Gestion des conducteurs"
        subtitle="Aperçu synthétique et accès aux fonctionnalités de l'équipe de conduite"
        breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Conducteurs' }]}
      />

      {/* Conducteurs Stats Banner */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total conducteurs</Typography>
                  {isLoading ? <Skeleton width={40} height={32} /> : <Typography variant="h4" fontWeight={700}>{stats?.total ?? 0}</Typography>}
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <AssignmentIndIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Disponibles</Typography>
                  {isLoading ? <Skeleton width={40} height={32} /> : <Typography variant="h4" fontWeight={700} color="success.main">{stats?.disponibles ?? 0}</Typography>}
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircleOutlineIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">En voyage</Typography>
                  {isLoading ? <Skeleton width={40} height={32} /> : <Typography variant="h4" fontWeight={700} color="info.main">{stats?.enVoyage ?? 0}</Typography>}
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <LocalShippingIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Indisponibles</Typography>
                  {isLoading ? <Skeleton width={40} height={32} /> : <Typography variant="h4" fontWeight={700} color="warning.main">{stats?.indisponibles ?? 0}</Typography>}
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <PauseCircleOutlineIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Inactifs</Typography>
                  {isLoading ? <Skeleton width={40} height={32} /> : <Typography variant="h4" fontWeight={700} color="error.main">{stats?.inactifs ?? 0}</Typography>}
                </Box>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                  <CancelIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Access Cards */}
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} md={6} key={card.to}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  {card.icon}
                  <Typography variant="h6" fontWeight={700}>{card.title}</Typography>
                </Stack>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
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
