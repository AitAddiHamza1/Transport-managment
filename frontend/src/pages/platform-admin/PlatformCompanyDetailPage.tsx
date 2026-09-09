import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { platformApi } from '../../lib/platformApi';
import { getApiErrorMessage } from '../../lib/axios';
import { notify } from '../../utils/notify';
import { UpdateCompanyStatusDialog } from '../../components/platform-admin/UpdateCompanyStatusDialog';

interface CompanyDetailView {
  id: number;
  nom: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF';
  creeLe: string;
  misAJourLe: string;
  usersCount: number;
  isConfigured: boolean;
  settingsSummary: {
    nomEntreprise: string | null;
    email: string | null;
    telephone: string | null;
    ville: string | null;
    ice: string | null;
  } | null;
}

export function PlatformCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await platformApi.get(`/platform/companies/${id}`);
      setCompany(response.data);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Impossible de charger les détails de l’entreprise'));
      navigate('/platform-admin/companies');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!company) return null;

  const getStatusChip = (statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF') => {
    switch (statut) {
      case 'ACTIF':
        return <Chip label="ACTIF" sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 700 }} />;
      case 'SUSPENDU':
        return <Chip label="SUSPENDU" sx={{ bgcolor: 'rgba(234, 179, 8, 0.2)', color: '#fde047', fontWeight: 700 }} />;
      case 'INACTIF':
        return <Chip label="INACTIF" sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontWeight: 700 }} />;
    }
  };

  return (
    <Box>
      <Button
        component={Link}
        to="/platform-admin/companies"
        startIcon={<ArrowBackIcon />}
        sx={{ color: '#94a3b8', mb: 3, '&:hover': { color: '#f8fafc' } }}
      >
        Retour à la liste des entreprises
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: 40, color: '#38bdf8' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              {company.nom}
            </Typography>

            <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
              ID Entreprise : #{company.id}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getStatusChip(company.statut)}
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setStatusDialogOpen(true)}
            sx={{ color: '#eab308', borderColor: '#eab308', '&:hover': { borderColor: '#fde047', bgcolor: 'rgba(234, 179, 8, 0.1)' } }}
          >
            Changer le Statut
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#38bdf8', mb: 2 }}>
                Informations Générales
              </Typography>
              <Divider sx={{ borderColor: '#334155', mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Date de création :{' '}
                    <strong style={{ color: '#f8fafc' }}>{new Date(company.creeLe).toLocaleString('fr-FR')}</strong>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Nombre d'utilisateurs inscrits :{' '}
                    <strong style={{ color: '#f8fafc' }}>{company.usersCount} compte(s)</strong>
                  </Typography>
                </Box>

                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.5 }}>
                    État de configuration de l'entreprise :
                  </Typography>
                  {company.isConfigured ? (
                    <Chip label="Profil complet (Nom, Adresse, Téléphone, Email configurés)" color="success" size="small" />
                  ) : (
                    <Chip label="Profil incomplet" color="warning" size="small" />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#38bdf8', mb: 2 }}>
                Coordonnées Administratives
              </Typography>
              <Divider sx={{ borderColor: '#334155', mb: 2 }} />

              {company.settingsSummary ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Raison Sociale : <strong style={{ color: '#f8fafc' }}>{company.settingsSummary.nomEntreprise || 'Non renseigné'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Adresse E-mail : <strong style={{ color: '#f8fafc' }}>{company.settingsSummary.email || 'Non renseigné'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Téléphone : <strong style={{ color: '#f8fafc' }}>{company.settingsSummary.telephone || 'Non renseigné'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Ville : <strong style={{ color: '#f8fafc' }}>{company.settingsSummary.ville || 'Non renseignée'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    N° ICE : <strong style={{ color: '#f8fafc' }}>{company.settingsSummary.ice || 'Non renseigné'}</strong>
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Aucun paramètre configuré pour le moment.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <UpdateCompanyStatusDialog
        open={statusDialogOpen}
        company={company}
        onClose={() => setStatusDialogOpen(false)}
        onSuccess={fetchDetail}
      />
    </Box>
  );
}
