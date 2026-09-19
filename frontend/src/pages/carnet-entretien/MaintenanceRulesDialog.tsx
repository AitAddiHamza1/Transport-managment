import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import { useState } from 'react';

import {
  CreateMaintenanceRulePayload,
  MaintenanceRule,
  MaintenanceTriggerType,
} from '../../features/carnet-entretien/types';
import {
  useCarnetRules,
  useCreateCarnetRule,
  useDeleteCarnetRule,
  useUpdateCarnetRule,
} from '../../features/carnet-entretien/useCarnetEntretien';
import { Can, ConfirmDialog } from '../../components/shared';

interface MaintenanceRulesDialogProps {
  open: boolean;
  onClose: () => void;
}

const TRIGGER_LABELS: Record<MaintenanceTriggerType, string> = {
  KILOMETRAGE: 'Kilométrage',
  DATE: 'Date / Durée',
  KILOMETRAGE_OU_DATE: 'Kilométrage ou Date',
};

export function MaintenanceRulesDialog({ open, onClose }: MaintenanceRulesDialogProps) {
  const { data: rules = [], isLoading } = useCarnetRules();
  const createMutation = useCreateCarnetRule();
  const updateMutation = useUpdateCarnetRule();
  const deleteMutation = useDeleteCarnetRule();

  // Form mode inside dialog: 'LIST' | 'FORM'
  const [mode, setMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingRule, setEditingRule] = useState<MaintenanceRule | null>(null);
  const [deleteTargetRule, setDeleteTargetRule] = useState<MaintenanceRule | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [triggerType, setTriggerType] = useState<MaintenanceTriggerType>('KILOMETRAGE');
  const [intervalleKm, setIntervalleKm] = useState<string>('');
  const [intervalleMois, setIntervalleMois] = useState<string>('');
  const [seuilAlerteKm, setSeuilAlerteKm] = useState<string>('');
  const [seuilAlerteJours, setSeuilAlerteJours] = useState<string>('');
  const [description, setDescription] = useState('');

  const handleOpenForm = (rule?: MaintenanceRule) => {
    if (rule) {
      setEditingRule(rule);
      setCode(rule.code);
      setNom(rule.nom);
      setTriggerType(rule.triggerType);
      setIntervalleKm(rule.intervalleKm !== null ? String(rule.intervalleKm) : '');
      setIntervalleMois(rule.intervalleMois !== null ? String(rule.intervalleMois) : '');
      setSeuilAlerteKm(rule.seuilAlerteKm !== null ? String(rule.seuilAlerteKm) : '');
      setSeuilAlerteJours(rule.seuilAlerteJours !== null ? String(rule.seuilAlerteJours) : '');
      setDescription(rule.description || '');
    } else {
      setEditingRule(null);
      setCode('');
      setNom('');
      setTriggerType('KILOMETRAGE');
      setIntervalleKm('');
      setIntervalleMois('');
      setSeuilAlerteKm('');
      setSeuilAlerteJours('');
      setDescription('');
    }
    setMode('FORM');
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !nom.trim()) return;

    const payload: CreateMaintenanceRulePayload = {
      code: code.trim().toUpperCase(),
      nom: nom.trim(),
      triggerType,
      intervalleKm: intervalleKm !== '' ? Number(intervalleKm) : null,
      intervalleMois: intervalleMois !== '' ? Number(intervalleMois) : null,
      seuilAlerteKm: seuilAlerteKm !== '' ? Number(seuilAlerteKm) : null,
      seuilAlerteJours: seuilAlerteJours !== '' ? Number(seuilAlerteJours) : null,
      description: description.trim() || null,
    };

    if (editingRule) {
      await updateMutation.mutateAsync({ id: editingRule.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setMode('LIST');
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetRule) {
      await deleteMutation.mutateAsync(deleteTargetRule.id);
      setDeleteTargetRule(null);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <BuildIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Règles d'entretien & Intervalles
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          {mode === 'LIST' ? (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Définissez les règles de maintenance récurrente pour vos véhicules.
                </Typography>
                <Can module="carnet_entretien" action="ajouter">
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
                    Nouvelle règle
                  </Button>
                </Can>
              </Stack>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Nom de la règle</TableCell>
                      <TableCell>Déclencheur</TableCell>
                      <TableCell align="right">Intervalle Km</TableCell>
                      <TableCell align="right">Intervalle Mois</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rules.length > 0 ? (
                      rules.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Chip label={r.code} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {r.nom}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={TRIGGER_LABELS[r.triggerType] || r.triggerType}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {r.intervalleKm ? `${r.intervalleKm.toLocaleString('fr-FR')} km` : '—'}
                          </TableCell>
                          <TableCell align="right">
                            {r.intervalleMois ? `${r.intervalleMois} mois` : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Can module="carnet_entretien" action="modifier">
                                <IconButton size="small" color="primary" onClick={() => handleOpenForm(r)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Can>
                              <Can module="carnet_entretien" action="supprimer">
                                <IconButton size="small" color="error" onClick={() => setDeleteTargetRule(r)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Can>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Aucune règle d'entretien enregistrée.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Stack>
          ) : (
            <form onSubmit={handleSaveRule}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Code de la règle *"
                    placeholder="Ex: VIDANGE_10K"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nom de la règle *"
                    placeholder="Ex: Vidange moteur & filtres"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Type de déclencheur *"
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as MaintenanceTriggerType)}
                  >
                    <MenuItem value="KILOMETRAGE">Kilométrage</MenuItem>
                    <MenuItem value="DATE">Date / Durée (Mois)</MenuItem>
                    <MenuItem value="KILOMETRAGE_OU_DATE">Kilométrage OU Date (Première échéance atteint)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Intervalle Km"
                    placeholder="Ex: 10000"
                    value={intervalleKm}
                    onChange={(e) => setIntervalleKm(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Intervalle Mois"
                    placeholder="Ex: 6"
                    value={intervalleMois}
                    onChange={(e) => setIntervalleMois(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Seuil d'alerte Km"
                    placeholder="Ex: 1000"
                    value={seuilAlerteKm}
                    onChange={(e) => setSeuilAlerteKm(e.target.value)}
                    helperText="Déclenche le statut 'À venir' quand il reste <= cet intervalle"
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Seuil d'alerte Jours"
                    placeholder="Ex: 15"
                    value={seuilAlerteJours}
                    onChange={(e) => setSeuilAlerteJours(e.target.value)}
                    helperText="Déclenche le statut 'À venir' quand il reste <= ce nombre de jours"
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    label="Description"
                    placeholder="Remarques et consignes de révision..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button variant="outlined" onClick={() => setMode('LIST')}>
                  Retour
                </Button>
                <Button variant="contained" type="submit">
                  {editingRule ? 'Mettre à jour' : 'Enregistrer la règle'}
                </Button>
              </Stack>
            </form>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={onClose}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetRule !== null}
        title="Supprimer cette règle d'entretien ?"
        description={
          deleteTargetRule
            ? `Êtes-vous sûr de vouloir supprimer la règle "${deleteTargetRule.nom}" (${deleteTargetRule.code}) ?`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTargetRule(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
