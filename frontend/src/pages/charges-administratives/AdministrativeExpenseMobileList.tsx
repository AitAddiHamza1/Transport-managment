import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {
  CATEGORY_LABELS,
  ChargeAdministrative,
} from '../../features/charges-administratives/types';
import { Can } from '../../components/shared/Can';

interface AdministrativeExpenseMobileListProps {
  expenses: ChargeAdministrative[];
  onView: (expense: ChargeAdministrative) => void;
  onEdit: (expense: ChargeAdministrative) => void;
  onDelete: (expense: ChargeAdministrative) => void;
}

export function AdministrativeExpenseMobileList({
  expenses,
  onView,
  onEdit,
  onDelete,
}: AdministrativeExpenseMobileListProps) {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {expenses.map((exp) => {
        const numMontant = parseFloat(exp.montant);
        const formattedMontant = !isNaN(numMontant)
          ? numMontant.toLocaleString('fr-FR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : exp.montant;

        return (
          <Card key={exp.idDepense} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    #{exp.idDepense} — {new Date(exp.dateDepense).toLocaleDateString('fr-FR')}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {CATEGORY_LABELS[exp.categorieDepense as keyof typeof CATEGORY_LABELS] ||
                      exp.categorieDepense}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {formattedMontant} MAD
                </Typography>
              </Stack>

              {exp.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {exp.description}
                </Typography>
              )}

              <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px solid #f1f5f9">
                <Box>
                  {exp.hasReceipt ? (
                    <Chip
                      size="small"
                      icon={<AttachFileIcon />}
                      label="Justificatif joint"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <Chip size="small" label="Sans reçu" color="default" variant="outlined" />
                  )}
                </Box>

                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" color="primary" onClick={() => onView(exp)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>

                  <Can module="depenses_administratives" action="modifier">
                    <IconButton size="small" color="info" onClick={() => onEdit(exp)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Can>

                  <Can module="depenses_administratives" action="supprimer">
                    <IconButton size="small" color="error" onClick={() => onDelete(exp)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Can>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
