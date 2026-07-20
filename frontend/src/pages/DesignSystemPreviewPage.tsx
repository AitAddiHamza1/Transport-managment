import { useState } from 'react';
import {
  Button,
  Grid,
  Typography,
  Box,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';

import {
  AppPage,
  PageHeader,
  SectionHeader,
  ResponsiveActions,
  ActionMenu,
  FormActions,
  SearchField,
  ListToolbar,
  ResponsiveDataView,
  DataTableShell,
  MobileCardList,
  AppPagination,
  StatusChip,
  LoadingState,
  FullScreenLoader,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  FormSection,
  FormGrid,
  SectionCard,
  StatCard,
} from '../components/shared';

export function DesignSystemPreviewPage() {
  // State for search and filters demo
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Full Screen Loader state
  const [fsLoaderOpen, setFsLoaderOpen] = useState(false);

  // Handle Confirm action
  const handleConfirmAction = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
    }, 2000);
  };

  // Trigger Full Screen Loader simulation for 3 seconds
  const handleTriggerFsLoader = () => {
    setFsLoaderOpen(true);
    setTimeout(() => {
      setFsLoaderOpen(false);
    }, 3000);
  };

  // Mock data for table and card demonstrations
  const demoItems = [
    { id: '1', name: 'Élément A', description: 'Description de l’élément A', status: 'success', statusLabel: 'Actif' },
    { id: '2', name: 'Élément B', description: 'Description de l’élément B', status: 'warning', statusLabel: 'En attente' },
    { id: '3', name: 'Élément C', description: 'Description de l’élément C', status: 'error', statusLabel: 'Suspendu' },
    { id: '4', name: 'Élément D', description: 'Description de l’élément D', status: 'info', statusLabel: 'Nouveau' },
    { id: '5', name: 'Élément E', description: 'Description de l’élément E', status: 'neutral', statusLabel: 'Inactif' },
  ];

  return (
    <AppPage>
      {/* Simulation overlay for FullScreenLoader */}
      {fsLoaderOpen && (
        <FullScreenLoader label="Restauration de la session de démonstration..." />
      )}

      {/* Page Header */}
      <PageHeader
        title="Système de Design"
        subtitle="Bibliothèque de composants UI réutilisables et normalisés pour l'ERP."
        breadcrumbs={[
          { label: 'Accueil', to: '/' },
          { label: 'Système de Design' },
        ]}
        action={
          <Button variant="contained" onClick={handleTriggerFsLoader}>
            Simuler Chargement Plein Écran
          </Button>
        }
      />

      <Divider sx={{ my: 4 }} />

      <Grid container spacing={4}>
        {/* SECTION 1: STRUCTURE DE PAGE */}
        <Grid item xs={12}>
          <SectionHeader
            title="1. Structure de Page"
            description="Composants structurant l’espace de travail et les titres."
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <SectionCard title="Aperçu PageHeader" subtitle="En-tête de page standard">
                <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                  <PageHeader
                    title="Titre de la Page de Démonstration"
                    subtitle="Ceci est une description textuelle expliquant le but de cette page."
                    breadcrumbs={[
                      { label: 'Module', to: '#' },
                      { label: 'Sous-module', to: '#' },
                      { label: 'Page courante' },
                    ]}
                    action={<Button variant="contained">Action</Button>}
                  />
                </Box>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="Aperçu SectionHeader" subtitle="Titre secondaire pour cartes ou blocs">
                <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                  <SectionHeader
                    title="Section Informations Générales"
                    description="Gérer les informations de base"
                    action={
                      <Button size="small" variant="text">
                        Modifier
                      </Button>
                    }
                  />
                </Box>
              </SectionCard>
            </Grid>
          </Grid>
        </Grid>

        {/* SECTION 2: ACTIONS & BARRES D'OUTILS */}
        <Grid item xs={12}>
          <SectionHeader
            title="2. Actions & Barres d’Outils"
            description="Boutons adaptatifs, menus de lignes de table et actions de formulaire."
          />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SectionCard title="ResponsiveActions" subtitle="Boutons réalignables sur mobile">
                <Stack spacing={2}>
                  <Typography variant="caption" color="text.secondary">
                    Comportement par défaut (horizontal, wrap sur mobile) :
                  </Typography>
                  <ResponsiveActions>
                    <Button variant="contained">Ajouter</Button>
                    <Button variant="outlined">Exporter</Button>
                    <Button variant="text" color="inherit">
                      Annuler
                    </Button>
                  </ResponsiveActions>
                </Stack>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="ActionMenu (Dropdown de Ligne)" subtitle="Menu contextuel pour lignes de tableau">
                <Stack direction="row" spacing={3} alignItems="center">
                  <Typography variant="body2">Cliquez sur l'icône pour voir les actions :</Typography>
                  <ActionMenu
                    actions={[
                      {
                        label: 'Consulter',
                        icon: <VisibilityIcon fontSize="small" />,
                        onClick: () => alert('Action: Consulter'),
                      },
                      {
                        label: 'Modifier',
                        icon: <EditIcon fontSize="small" />,
                        onClick: () => alert('Action: Modifier'),
                      },
                      { divider: true },
                      {
                        label: 'Supprimer',
                        icon: <DeleteIcon fontSize="small" />,
                        onClick: () => alert('Action: Supprimer'),
                        destructive: true,
                      },
                    ]}
                  />
                </Stack>
              </SectionCard>
            </Grid>

            <Grid item xs={12}>
              <SectionCard title="FormActions" subtitle="Boutons de pied de formulaire normalisés">
                <FormActions
                  onSubmit={() => alert('Formulaire soumis !')}
                  onCancel={() => alert('Annulé')}
                  submitLabel="Enregistrer le dossier"
                  cancelLabel="Retour"
                />
              </SectionCard>
            </Grid>

            <Grid item xs={12}>
              <SectionCard title="ListToolbar & SearchField" subtitle="Filtrage et recherche adaptatifs">
                <ListToolbar
                  searchField={
                    <SearchField
                      value={searchValue}
                      onChange={setSearchValue}
                      placeholder="Rechercher des éléments..."
                    />
                  }
                  onResetFilters={() => setSearchValue('')}
                  resetDisabled={!searchValue}
                  action={<Button variant="contained">Créer un élément</Button>}
                >
                  {/* Custom filter select inside ListToolbar slot */}
                  <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                    [Filtre personnalisé]
                  </Typography>
                </ListToolbar>
              </SectionCard>
            </Grid>
          </Grid>
        </Grid>

        {/* SECTION 3: STATUTS & RETROACTIONS */}
        <Grid item xs={12}>
          <SectionHeader
            title="3. Statuts & Rétroactions"
            description="Chips de statuts, loaders, indicateurs vides et d'erreurs."
          />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SectionCard title="StatusChips" subtitle="Indicateurs sémantiques textuels">
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <StatusChip label="Actif" variant="success" />
                  <StatusChip label="En attente" variant="warning" />
                  <StatusChip label="Suspendu" variant="error" />
                  <StatusChip label="Nouveau" variant="info" />
                  <StatusChip label="Inactif" variant="neutral" />
                  <StatusChip label="Par défaut" variant="default" />
                </Stack>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="LoadingState" subtitle="Indicateur d’attente intégré">
                <LoadingState message="Chargement des données en cours..." compact={true} />
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="EmptyState" subtitle="Affichage en cas de liste vide">
                <EmptyState
                  title="Aucun document trouvé"
                  description="Essayez de modifier vos critères de recherche ou ajoutez une nouvelle entrée."
                  action={<Button variant="contained" size="small">Créer une facture</Button>}
                  compact={true}
                />
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="ErrorState" subtitle="Affichage des erreurs serveurs">
                <ErrorState
                  message="Échec de la connexion réseau. Impossible de contacter le serveur ERP."
                  onRetry={() => alert('Nouvelle tentative...')}
                  compact={true}
                />
              </SectionCard>
            </Grid>
          </Grid>
        </Grid>

        {/* SECTION 4: DIALOGUES */}
        <Grid item xs={12}>
          <SectionHeader
            title="4. Dialogues"
            description="Confirmations critiques et modales sécurisées."
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <SectionCard title="ConfirmDialog" subtitle="Simulation de confirmation de suppression">
                <Box>
                  <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>
                    Supprimer l’élément X
                  </Button>

                  <ConfirmDialog
                    open={confirmOpen}
                    title="Supprimer définitivement l'élément X ?"
                    description="Cette action est irréversible. L'élément sera définitivement effacé du système."
                    confirmLabel="Supprimer"
                    cancelLabel="Conserver"
                    severity="error"
                    loading={confirmLoading}
                    onConfirm={handleConfirmAction}
                    onClose={() => setConfirmOpen(false)}
                  />
                </Box>
              </SectionCard>
            </Grid>
          </Grid>
        </Grid>

        {/* SECTION 5: AFFICHAGE DE DONNÉES */}
        <Grid item xs={12}>
          <SectionHeader
            title="5. Affichage de Données"
            description="Tableaux de bureau adaptatifs et listes de cartes sur mobile."
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <SectionCard
                title="ResponsiveDataView"
                subtitle="Bascule automatiquement entre table et liste de cartes (breakpoint md = 900px)"
              >
                <ResponsiveDataView
                  desktop={
                    <DataTableShell
                      empty={demoItems.length === 0}
                      emptyState={<EmptyState title="Aucune donnée" />}
                      pagination={
                        <AppPagination
                          page={page}
                          pageSize={pageSize}
                          totalCount={25}
                          onPageChange={setPage}
                          onPageSizeChange={setPageSize}
                        />
                      }
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Nom</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {demoItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.id}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>
                                <StatusChip
                                  label={item.statusLabel}
                                  variant={item.status as any}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small">
                                  <EditIcon fontSize="inherit" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DataTableShell>
                  }
                  mobile={
                    <MobileCardList
                      empty={demoItems.length === 0}
                      emptyState={<EmptyState title="Aucune donnée" />}
                      footer={
                        <AppPagination
                          page={page}
                          pageSize={pageSize}
                          totalCount={25}
                          onPageChange={setPage}
                          onPageSizeChange={setPageSize}
                        />
                      }
                    >
                      {demoItems.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: (theme) => `${theme.customRadii.medium}px`,
                            p: 2,
                            mb: 2,
                            bgcolor: 'background.paper',
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {item.name}
                            </Typography>
                            <StatusChip
                              label={item.statusLabel}
                              variant={item.status as any}
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {item.description}
                          </Typography>
                          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button size="small" variant="outlined">
                              Modifier
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </MobileCardList>
                  }
                />
              </SectionCard>
            </Grid>
          </Grid>
        </Grid>

        {/* SECTION 6: FORMULAIRES & GRILLES */}
        <Grid item xs={12}>
          <SectionHeader
            title="6. Formulaires & Grilles"
            description="Sections de formulaires et structures en grilles alignées."
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormSection
                title="Informations d'Inscription"
                description="Remplir les informations administratives."
              >
                <FormGrid columns={3}>
                  <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Champ Grid 1</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>Nom complet</Typography>
                  </Box>
                  <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Champ Grid 2</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>Adresse email</Typography>
                  </Box>
                  <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Champ Grid 3</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>Rôle administratif</Typography>
                  </Box>
                </FormGrid>
              </FormSection>
            </Grid>
          </Grid>
        </Grid>

        {/* SECTION 7: CARTES & STATISTIQUES */}
        <Grid item xs={12}>
          <SectionHeader
            title="7. Cartes & Statistiques"
            description="Blocs indicateurs de performances et de chiffres-clés."
          />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Voyages Effectués"
                value="142"
                icon={<TravelExploreIcon />}
                trend={{ label: '+12% ce mois', direction: 'up', tone: 'success' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Véhicules Actifs"
                value="28 / 30"
                icon={<StarIcon />}
                helperText="2 en maintenance"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Consommation Carburant"
                value="4,820 L"
                trend={{ label: '-5% ce mois', direction: 'down', tone: 'success' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Incidents Signalés"
                value="3"
                trend={{ label: 'Critique', direction: 'neutral', tone: 'error' }}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </AppPage>
  );
}
