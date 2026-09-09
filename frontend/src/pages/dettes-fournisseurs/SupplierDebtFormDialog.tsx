import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
} from '@mui/material';
import { useFournisseursQuery } from '../../features/fournisseurs/useFournisseurs';
import {
  useCreateDetteFournisseur,
  useUpdateDetteFournisseur,
} from '../../features/dettes-fournisseurs/useDettesFournisseurs';
import type { DetteFournisseurView } from '../../features/dettes-fournisseurs/types';
import { notify } from '../../utils/notify';

interface SupplierDebtFormDialogProps {
  open: boolean;
  onClose: () => void;
  detteToEdit?: DetteFournisseurView | null;
}

export const SupplierDebtFormDialog: React.FC<SupplierDebtFormDialogProps> = ({
  open,
  onClose,
  detteToEdit,
}) => {
  const isEdit = Boolean(detteToEdit);

  // Fetch active suppliers
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useFournisseursQuery({ limit: 100 });
  const suppliers = suppliersData?.data || [];

  const createMutation = useCreateDetteFournisseur();
  const updateMutation = useUpdateDetteFournisseur();

  // Form state
  const [idFournisseur, setIdFournisseur] = useState<number | ''>('');
  const [referenceFactureFournisseur, setReferenceFactureFournisseur] = useState('');
  const [dateDette, setDateDette] = useState(new Date().toISOString().substring(0, 10));
  const [delaiPaiementJours, setDelaiPaiementJours] = useState<number | ''>(30);
  const [montantDu, setMontantDu] = useState<number | ''>('');
  const [categorie, setCategorie] = useState('');
  const [remarques, setRemarques] = useState('');

  useEffect(() => {
    if (detteToEdit) {
      setIdFournisseur(detteToEdit.idFournisseur);
      setReferenceFactureFournisseur(detteToEdit.referenceFactureFournisseur || '');
      setDateDette(detteToEdit.dateDette || new Date().toISOString().substring(0, 10));
      setDelaiPaiementJours(detteToEdit.delaiPaiementJours);
      setMontantDu(detteToEdit.montantDu);
      setCategorie(detteToEdit.categorie || '');
      setRemarques(detteToEdit.remarques || '');
    } else {
      setIdFournisseur('');
      setReferenceFactureFournisseur('');
      const today = new Date().toISOString().substring(0, 10);
      setDateDette(today);
      setDelaiPaiementJours(30);
      setMontantDu('');
      setCategorie('');
      setRemarques('');
    }
  }, [detteToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idFournisseur) {
      notify.error('Veuillez sélectionner un fournisseur');
      return;
    }
    if (!montantDu || Number(montantDu) <= 0) {
      notify.error('Le montant dû doit être supérieur à 0');
      return;
    }

    if (isEdit && detteToEdit) {
      updateMutation.mutate(
        {
          id: detteToEdit.id,
          payload: {
            idFournisseur: Number(idFournisseur),
            referenceFactureFournisseur: referenceFactureFournisseur.trim() || undefined,
            dateDette: dateDette || undefined,
            delaiPaiementJours: delaiPaiementJours !== '' ? Number(delaiPaiementJours) : undefined,
            montantDu: Number(montantDu),
            categorie: categorie.trim() || undefined,
            remarques: remarques.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            notify.success('Dette fournisseur mise à jour avec succès');
            onClose();
          },
          onError: (err: any) => {
            const msg = err.response?.data?.message || 'Erreur lors de la mise à jour';
            notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          idFournisseur: Number(idFournisseur),
          referenceFactureFournisseur: referenceFactureFournisseur.trim() || undefined,
          dateDette: dateDette || undefined,
          delaiPaiementJours: delaiPaiementJours !== '' ? Number(delaiPaiementJours) : undefined,
          montantDu: Number(montantDu),
          categorie: categorie.trim() || undefined,
          remarques: remarques.trim() || undefined,
        },
        {
          onSuccess: (data) => {
            notify.success(`Dette fournisseur #${data.numeroDette} créée avec succès`);
            onClose();
          },
          onError: (err: any) => {
            const msg = err.response?.data?.message || 'Erreur lors de la création de la dette';
            notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        },
      );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit ? `Modifier la dette #${detteToEdit?.numeroDette}` : 'Nouvelle dette fournisseur'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Supplier selector */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                required
                label="Fournisseur"
                value={idFournisseur}
                onChange={(e) => setIdFournisseur(Number(e.target.value))}
                disabled={isEdit && (detteToEdit?.paiementsCount || 0) > 0}
                helperText={
                  isEdit && (detteToEdit?.paiementsCount || 0) > 0
                    ? 'Immutable car la dette possède des versements'
                    : undefined
                }
              >
                {isLoadingSuppliers ? (
                  <MenuItem value="" disabled>
                    Chargement des fournisseurs...
                  </MenuItem>
                ) : (
                  suppliers.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.nomFournisseur} {s.ice ? `(ICE: ${s.ice})` : ''}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Grid>

            {/* Reference Facture Fournisseur */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="N° Facture / Réf. Fournisseur"
                placeholder="ex: FAC-2026-0099"
                value={referenceFactureFournisseur}
                onChange={(e) => setReferenceFactureFournisseur(e.target.value)}
                disabled={isEdit && (detteToEdit?.paiementsCount || 0) > 0}
              />
            </Grid>

            {/* Date Dette */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Date de la dette"
                InputLabelProps={{ shrink: true }}
                value={dateDette}
                onChange={(e) => setDateDette(e.target.value)}
                disabled={isEdit && (detteToEdit?.paiementsCount || 0) > 0}
              />
            </Grid>

            {/* Delai Paiement Jours */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Délai de paiement (jours)"
                value={delaiPaiementJours}
                onChange={(e) =>
                  setDelaiPaiementJours(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={isEdit && (detteToEdit?.paiementsCount || 0) > 0}
              />
            </Grid>

            {/* Montant Du */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Montant Dû"
                value={montantDu}
                onChange={(e) => setMontantDu(e.target.value === '' ? '' : Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">MAD</InputAdornment>,
                }}
                disabled={isEdit && (detteToEdit?.paiementsCount || 0) > 0}
              />
            </Grid>

            {/* Categorie */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Catégorie"
                placeholder="ex: Carburant, Maintenance, Pièces..."
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
              />
            </Grid>

            {/* Remarques */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Remarques"
                placeholder="Remarques ou détails complémentaires"
                value={remarques}
                onChange={(e) => setRemarques(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la dette'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

