import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DashboardPreset } from '../../features/dashboard/types';

interface DashboardPeriodFilterProps {
  preset: DashboardPreset;
  dateDebut: string;
  dateFin: string;
  onPresetChange: (preset: DashboardPreset) => void;
  onCustomDatesChange: (dateDebut: string, dateFin: string) => void;
}

export const DashboardPeriodFilter: React.FC<DashboardPeriodFilterProps> = ({
  preset,
  dateDebut,
  dateFin,
  onPresetChange,
  onCustomDatesChange,
}) => {
  const presets: Array<{ key: DashboardPreset; label: string }> = [
    { key: 'AUJOURDHUI', label: "Aujourd'hui" },
    { key: 'CE_MOIS', label: 'Ce mois' },
    { key: 'CE_TRIMESTRE', label: 'Ce trimestre' },
    { key: 'CETTE_ANNEE', label: 'Cette année' },
    { key: 'PERSONNALISE', label: 'Personnalisé' },
  ];

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarTodayIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              Période d'analyse :
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" width={{ xs: '100%', md: 'auto' }}>
            <ButtonGroup variant="outlined" size="small">
              {presets.map((p) => (
                <Button
                  key={p.key}
                  variant={preset === p.key ? 'contained' : 'outlined'}
                  onClick={() => onPresetChange(p.key)}
                  sx={{ textTransform: 'none', fontWeight: preset === p.key ? 600 : 400 }}
                >
                  {p.label}
                </Button>
              ))}
            </ButtonGroup>

            {preset === 'PERSONNALISE' && (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="date"
                  size="small"
                  label="Du"
                  value={dateDebut}
                  onChange={(e) => onCustomDatesChange(e.target.value, dateFin)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="Au"
                  value={dateFin}
                  onChange={(e) => onCustomDatesChange(dateDebut, e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
