import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import { useCreatePaiementFournisseur } from '../../features/paiements-fournisseurs/usePaiementsFournisseurs';
import { useDettesFournisseursQuery } from '../../features/dettes-fournisseurs/useDettesFournisseurs';
import type { DetteFournisseurView } from '../../features/dettes-fournisseurs/types';
import { notify } from '../../utils/notify';

interface AddSupplierPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  dette?: DetteFournisseurView | null;
}

export const AddSupplierPaymentDialog: React.FC<AddSupplierPaymentDialogProps> = ({
  open,
  onClose,
  dette,
}) => {
  const isPreselectedMode = Boolean(dette);

  // Query eligible debts for Mode B (no pre-selected debt)
  const { data: debtsData, isLoading: isLoadingDebts } = useDettesFournisseursQuery(
    { limit: 100 },
  );

  const eligibleDebts = (debtsData?.data || []).filter((d) => d.soldeRestant > 0);

  const createPaymentMutation = useCreatePaiementFournisseur();

  // State
  const [selectedDebtId, setSelectedDebtId] = useState<number | ''>(dette ? dette.id : '');
  const [activeDebt, setActiveDebt] = useState<DetteFournisseurView | null>(dette || null);
  const [montant, setMontant] = useState<number | ''>(dette ? dette.soldeRestant : '');
  const [modePaiement, setModePaiement] = useState('VIREMENT');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().substring(0, 10));
  const [referenceExterne, setReferenceExterne] = useState('');
  const [notes, setNotes] = useState('');

  // Lettre de change fields
  const [lettreNumero, setLettreNumero] = useState('');
  const [lettreDateEcheance, setLettreDateEcheance] = useState('');
  const [lettreMontant, setLettreMontant] = useState('');
  const [lettreBeneficiaire, setLettreBeneficiaire] = useState('');
  const [lettreCause, setLettreCause] = useState('');
  const [lettreTireNom, setLettreTireNom] = useState('');
  const [lettreTireAdresse, setLettreTireAdresse] = useState('');

  // Reset dialog state when open prop or preselected dette changes
  useEffect(() => {
    if (dette) {
      setActiveDebt(dette);
      setSelectedDebtId(dette.id);
      setMontant(dette.soldeRestant);
    } else {
      setActiveDebt(null);
      setSelectedDebtId('');
      setMontant('');
    }

    setModePaiement('VIREMENT');
    setDatePaiement(new Date().toISOString().substring(0, 10));
    setReferenceExterne('');
    setNotes('');
    setLettreNumero('');
    setLettreDateEcheance('');
    setLettreMontant('');
    setLettreBeneficiaire('');
    setLettreCause('');
    setLettreTireNom('');
    setLettreTireAdresse('');
  }, [dette, open]);

  // Reset Lettre de change fields on mode change
  useEffect(() => {
    setLettreNumero('');
    setLettreDateEcheance('');
    setLettreMontant('');
    setLettreBeneficiaire('');
    setLettreCause('');
    setLettreTireNom('');
    setLettreTireAdresse('');
  }, [modePaiement]);

  const handleDebtSelect = (id: number) => {
    setSelectedDebtId(id);
    const found = eligibleDebts.find((d) => d.id === id) || null;
    setActiveDebt(found);
    if (found) {
      setMontant(found.soldeRestant);
    } else {
      setMontant('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeDebt) {
      notify.error('Veuillez sélectionner une dette fournisseur');
      return;
    }

    if (!montant || Number(montant) <= 0) {
      notify.error('Le montant du versement doit être supérieur à 0');
      return;
    }

    if (Number(montant) > activeDebt.soldeRestant) {
      notify.error(
        `Le montant (${montant} MAD) dépasse le solde restant de la dette (${activeDebt.soldeRestant} MAD)`,
      );
      return;
    }

    if (modePaiement === 'EFFET') {
      if (!lettreNumero.trim()) return notify.error('Le numéro de lettre de change est requis');
      if (!lettreDateEcheance) return notify.error('La date d échéance est requise');
      if (!lettreMontant || parseFloat(lettreMontant) <= 0)
        return notify.error('Le montant en chiffres est requis et doit être supérieur à 0');
      if (!lettreBeneficiaire.trim()) return notify.error('Le bénéficiaire est requis');
      if (!lettreCause.trim()) return notify.error('La cause est requise');
      if (!lettreTireNom.trim()) return notify.error('Le nom du tiré est requis');
      if (!lettreTireAdresse.trim()) return notify.error('L adresse du tiré est requise');
    }

    createPaymentMutation.mutate(
      {
        idDetteFournisseur: activeDebt.id,
        payload: {
          montant: Number(montant),
          modePaiement,
          datePaiement: datePaiement || undefined,
          referenceExterne: referenceExterne.trim() || undefined,
          notes: notes.trim() || undefined,
          lettreNumero: modePaiement === 'EFFET' ? lettreNumero.trim() : undefined,
          lettreDateEcheance: modePaiement === 'EFFET' ? lettreDateEcheance : undefined,
          lettreMontant: modePaiement === 'EFFET' ? parseFloat(lettreMontant) : undefined,
          lettreBeneficiaire: modePaiement === 'EFFET' ? lettreBeneficiaire.trim() : undefined,
          lettreCause: modePaiement === 'EFFET' ? lettreCause.trim() : undefined,
          lettreTireNom: modePaiement === 'EFFET' ? lettreTireNom.trim() : undefined,
          lettreTireAdresse: modePaiement === 'EFFET' ? lettreTireAdresse.trim() : undefined,
        } as any,
      },
      {
        onSuccess: () => {
          notify.success(`Versement de ${montant} MAD enregistré avec succès`);
          onClose();
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || 'Erreur lors du versement';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      },
    );
  };

  const getDialogTitle = () => {
    if (isPreselectedMode && dette) {
      return `Ajouter un versement pour la dette #${dette.numeroDette}`;
    }
    if (activeDebt) {
      return `Enregistrer un versement pour la dette #${activeDebt.numeroDette}`;
    }
    return 'Nouveau versement fournisseur';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent dividers>
          {/* Debt Selector Dropdown for Mode B (No pre-selected debt) */}
          {!isPreselectedMode && (
            <Box mb={2}>
              <TextField
                select
                fullWidth
                required
                label="Dette fournisseur *"
                value={selectedDebtId}
                onChange={(e) => handleDebtSelect(Number(e.target.value))}
                helperText="Sélectionnez la dette à régler"
              >
                {isLoadingDebts ? (
                  <MenuItem value="" disabled>
                    Chargement des dettes...
                  </MenuItem>
                ) : eligibleDebts.length === 0 ? (
                  <MenuItem value="" disabled>
                    Aucune dette en attente de règlement
                  </MenuItem>
                ) : (
                  eligibleDebts.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.numeroDette} — {d.nomFournisseurSnapshot}{' '}
                      {d.referenceFactureFournisseur ? `(Réf: ${d.referenceFactureFournisseur})` : ''}{' '}
                      — Solde: {d.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                      MAD
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Box>
          )}

          {/* Supplier Info & Solde Restant Box */}
          {activeDebt && (
            <Box mb={2} p={2} bgcolor="action.hover" borderRadius={2}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Fournisseur
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {activeDebt.nomFournisseurSnapshot}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Solde Restant
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">
                    {activeDebt.soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                    MAD
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Montant du versement"
                value={montant}
                onChange={(e) => setMontant(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={!activeDebt}
                InputProps={{
                  endAdornment: <InputAdornment position="end">MAD</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                required
                label="Mode de paiement"
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
                disabled={!activeDebt}
              >
                <MenuItem value="VIREMENT">VIREMENT</MenuItem>
                <MenuItem value="CHEQUE">CHÈQUE</MenuItem>
                <MenuItem value="ESPECES">ESPÈCES</MenuItem>
                <MenuItem value="CARTE">CARTE BANCAIRE</MenuItem>
                <MenuItem value="EFFET">Lettre de change</MenuItem>
                <MenuItem value="PRELEVEMENT">PRÉLÈVEMENT</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de versement"
                InputLabelProps={{ shrink: true }}
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                disabled={!activeDebt}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Réf. externe / N° Chèque"
                value={referenceExterne}
                onChange={(e) => setReferenceExterne(e.target.value)}
                disabled={!activeDebt}
              />
            </Grid>

            {modePaiement === 'EFFET' && activeDebt && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    borderColor: 'primary.light',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                    Informations — Lettre de change
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        label="N° Lettre de change"
                        value={lettreNumero}
                        onChange={(e) => setLettreNumero(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        label="Date d'échéance"
                        type="date"
                        value={lettreDateEcheance}
                        onChange={(e) => setLettreDateEcheance(e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        label="Montant en chiffres (MAD)"
                        type="number"
                        value={lettreMontant}
                        onChange={(e) => setLettreMontant(e.target.value)}
                        fullWidth
                        size="small"
                        inputProps={{ step: '0.01', min: '0.01' }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        label="Bénéficiaire"
                        value={lettreBeneficiaire}
                        onChange={(e) => setLettreBeneficiaire(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required
                        label="Cause"
                        value={lettreCause}
                        onChange={(e) => setLettreCause(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        label="Tiré — Nom"
                        value={lettreTireNom}
                        onChange={(e) => setLettreTireNom(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        label="Tiré — Adresse"
                        value={lettreTireAdresse}
                        onChange={(e) => setLettreTireAdresse(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!activeDebt}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={createPaymentMutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={createPaymentMutation.isPending || !activeDebt}
          >
            {createPaymentMutation.isPending ? 'Enregistrement...' : 'Valider le versement'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};


