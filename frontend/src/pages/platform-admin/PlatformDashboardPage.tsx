import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { platformApi } from '../../lib/platformApi';
import { getApiErrorMessage } from '../../lib/axios';
import { notify } from '../../utils/notify';
import { ProvisionCompanyDialog } from '../../components/platform-admin/ProvisionCompanyDialog';
import { UpdateCompanyStatusDialog } from '../../components/platform-admin/UpdateCompanyStatusDialog';

interface CompanyListItem {
  id: number;
  nom: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF';
  creeLe: string;
  misAJourLe: string;
  usersCount: number;
  isConfigured: boolean;
}

export function PlatformDashboardPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [statusDialogCompany, setStatusDialogCompany] = useState<CompanyListItem | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (statutFilter) params.statut = statutFilter;

      const response = await platformApi.get('/platform/companies', { params });
      setCompanies(response.data.data);
      setTotalPages(response.data.meta.totalPages);
      setTotalCount(response.data.meta.total);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Impossible de charger la liste des entreprises'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statutFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const getStatusChip = (statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF') => {
    switch (statut) {
      case 'ACTIF':
        return <Chip label="ACTIF" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 600 }} />;
      case 'SUSPENDU':
        return <Chip label="SUSPENDU" size="small" sx={{ bgcolor: 'rgba(234, 179, 8, 0.2)', color: '#fde047', fontWeight: 600 }} />;
      case 'INACTIF':
        return <Chip label="INACTIF" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontWeight: 600 }} />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc' }}>
            Gestion des Entreprises ({totalCount})
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Supervision du parc de sociétés et provisionnement SaaS
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setProvisionDialogOpen(true)}
          sx={{ bgcolor: '#0284c7', fontWeight: 600, '&:hover': { bgcolor: '#0369a1' } }}
        >
          Provisionner une Entreprise
        </Button>
      </Box>

      {/* Filter Bar */}
      <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2, mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Rechercher par nom d'entreprise..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flexGrow: 1,
              minWidth: 250,
              '& .MuiInputBase-root': { color: '#f8fafc', bgcolor: '#0f172a' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="statut-filter-label" sx={{ color: '#94a3b8' }}>
              Statut
            </InputLabel>
            <Select
              labelId="statut-filter-label"
              value={statutFilter}
              label="Statut"
              onChange={(e) => {
                setStatutFilter(e.target.value);
                setPage(1);
              }}
              sx={{ color: '#f8fafc', bgcolor: '#0f172a', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}
            >
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="ACTIF">ACTIF</MenuItem>
              <MenuItem value="SUSPENDU">SUSPENDU</MenuItem>
              <MenuItem value="INACTIF">INACTIF</MenuItem>
            </Select>
          </FormControl>

          <IconButton onClick={fetchCompanies} sx={{ color: '#94a3b8' }} title="Actualiser">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Card>

      {/* Companies Table */}
      <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#0f172a' }}>
              <TableRow>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Nom Entreprise</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Statut</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Utilisateurs</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Configuration</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Date de création</TableCell>
                <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    Aucune entreprise trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((co) => (
                  <TableRow key={co.id} sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.02)' } }}>
                    <TableCell sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>#{co.id}</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>{co.nom}</TableCell>
                    <TableCell>{getStatusChip(co.statut)}</TableCell>
                    <TableCell sx={{ color: '#cbd5e1' }}>{co.usersCount} compte(s)</TableCell>
                    <TableCell>
                      {co.isConfigured ? (
                        <Chip label="Complète" size="small" variant="outlined" sx={{ color: '#38bdf8', borderColor: '#38bdf8' }} />
                      ) : (
                        <Chip label="Incomplète" size="small" variant="outlined" sx={{ color: '#94a3b8', borderColor: '#475569' }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>{new Date(co.creeLe).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/platform-admin/companies/${co.id}`)}
                        sx={{ color: '#38bdf8', mr: 1 }}
                        title="Consulter les détails"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setStatusDialogCompany(co)}
                        sx={{ color: '#eab308' }}
                        title="Modifier le statut"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #334155' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              sx={{ '& .MuiPaginationItem-root': { color: '#f8fafc' } }}
            />
          </Box>
        )}
      </Card>

      <ProvisionCompanyDialog
        open={provisionDialogOpen}
        onClose={() => setProvisionDialogOpen(false)}
        onSuccess={fetchCompanies}
      />

      <UpdateCompanyStatusDialog
        open={Boolean(statusDialogCompany)}
        company={statusDialogCompany}
        onClose={() => setStatusDialogCompany(null)}
        onSuccess={fetchCompanies}
      />
    </Box>
  );
}
