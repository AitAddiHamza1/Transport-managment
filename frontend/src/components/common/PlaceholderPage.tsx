import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader, type BreadcrumbItem as Crumb } from '../shared';

interface PlaceholderPageProps {
  title: string;
  breadcrumbs: Crumb[];
}

/**
 * Page vide standard (structure de navigation) :
 * titre + fil d'Ariane + bouton « Nouveau » désactivé + carte vide.
 * Aucune logique métier ni appel API.
 */
export function PlaceholderPage({ title, breadcrumbs }: PlaceholderPageProps) {
  return (
    <Box>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        action={
          <Button variant="contained" startIcon={<AddIcon />} disabled>
            Nouveau
          </Button>
        }
      />
      <Card variant="outlined">
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Cette section sera développée dans une prochaine étape.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
