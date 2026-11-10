import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { PublicRoute } from '../components/routing/PublicRoute';
import { FullScreenLoader } from '../components/shared';
import { PermissionRoute } from '../components/routing/PermissionRoute';
import { PlatformProtectedRoute } from '../components/routing/PlatformProtectedRoute';

import {
  loadDashboardPage,
  loadVehiclesPage,
  loadVehicleListPage,
  loadVehicleDocumentsPage,
  loadConducteursPage,
  loadConducteurListPage,
  loadConducteurDocumentsPage,
  loadVoyageListPage,
  loadTraverseesListPage,
  loadClientListPage,
  loadVehicleExpenseListPage,
  loadCarnetEntretienPage,
  loadFournisseurListPage,
  loadCustomerPaymentsListPage,
  loadInvoiceListPage,
  loadSupplierDebtsListPage,
  loadSupplierPaymentsListPage,
  loadFuelListPage,
  loadStockGasoilListPage,
  loadPaymentManagementListPage,
  loadChequesLettresChangeListPage,
  loadCompanySettingsPage,
  loadEmployeListPage,
  loadEmployeePaymentsListPage,
  loadUsersListPage,
  loadNotificationsPage,
} from './erpRouteLoaders';

// Public Landing Page (Lazy)
const LandingPage = lazy(() => import('../landing/LandingPage'));

// Authentication Pages (Lazy)
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ChangePasswordPage = lazy(() => import('../pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));

// Layouts (Lazy)
const MainLayout = lazy(() => import('../components/layout/MainLayout').then((m) => ({ default: m.MainLayout })));
const PlatformAdminLayout = lazy(() => import('../components/platform-admin/PlatformAdminLayout').then((m) => ({ default: m.PlatformAdminLayout })));

// Platform Admin Pages (Lazy)
const PlatformLoginPage = lazy(() => import('../pages/platform-admin/PlatformLoginPage').then((m) => ({ default: m.PlatformLoginPage })));
const PlatformChangePasswordPage = lazy(() => import('../pages/platform-admin/PlatformChangePasswordPage').then((m) => ({ default: m.PlatformChangePasswordPage })));
const PlatformDashboardPage = lazy(() => import('../pages/platform-admin/PlatformDashboardPage').then((m) => ({ default: m.PlatformDashboardPage })));
const PlatformCompanyDetailPage = lazy(() => import('../pages/platform-admin/PlatformCompanyDetailPage').then((m) => ({ default: m.PlatformCompanyDetailPage })));

// Error & Dev System Pages (Lazy)
const ForbiddenPage = lazy(() => import('../pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const DesignSystemPreviewPage = lazy(() => import('../pages/DesignSystemPreviewPage').then((m) => ({ default: m.DesignSystemPreviewPage })));

// ERP Module Pages (Lazy via shared loaders)
const DashboardPage = lazy(loadDashboardPage);
const UsersListPage = lazy(loadUsersListPage);
const NotificationsPage = lazy(loadNotificationsPage);
const VehiclesPage = lazy(loadVehiclesPage);
const VehicleListPage = lazy(loadVehicleListPage);
const VehicleDocumentsPage = lazy(loadVehicleDocumentsPage);
const ConducteursPage = lazy(loadConducteursPage);
const ConducteurListPage = lazy(loadConducteurListPage);
const ConducteurDocumentsPage = lazy(loadConducteurDocumentsPage);
const VoyageListPage = lazy(loadVoyageListPage);
const TraverseesListPage = lazy(loadTraverseesListPage);
const ClientListPage = lazy(loadClientListPage);
const VehicleExpenseListPage = lazy(loadVehicleExpenseListPage);
const CarnetEntretienPage = lazy(loadCarnetEntretienPage);
const FournisseurListPage = lazy(loadFournisseurListPage);
const CustomerPaymentsListPage = lazy(loadCustomerPaymentsListPage);
const InvoiceListPage = lazy(loadInvoiceListPage);
const SupplierDebtsListPage = lazy(loadSupplierDebtsListPage);
const SupplierPaymentsListPage = lazy(loadSupplierPaymentsListPage);
const FuelListPage = lazy(loadFuelListPage);
const StockGasoilListPage = lazy(loadStockGasoilListPage);
const PaymentManagementListPage = lazy(loadPaymentManagementListPage);
const ChequesLettresChangeListPage = lazy(loadChequesLettresChangeListPage);
const CompanySettingsPage = lazy(loadCompanySettingsPage);
const EmployeListPage = lazy(loadEmployeListPage);
const EmployeePaymentsListPage = lazy(loadEmployeePaymentsListPage);

/**
 * Error boundary catching network / chunk loading errors on lazy-loaded routes
 */
interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

class ChunkErrorBoundary extends React.Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChunkErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erreur lors du chargement dynamique d\'un module:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#060D1A',
            color: '#FFFFFF',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#00D2BA' }}>
            Mise à jour de l'application
          </h2>
          <p style={{ maxWidth: '480px', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Une nouvelle version de Transivo est disponible ou une interruption réseau est survenue.
            Veuillez actualiser la page pour charger les derniers composants.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.75rem',
              backgroundColor: '#00D2BA',
              color: '#060D1A',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 210, 186, 0.4)',
            }}
          >
            Actualiser l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Helper to render a lazy component inside a Suspense boundary with a custom label
 */
function withSuspense(Component: React.ComponentType, label?: string) {
  return (
    <Suspense fallback={<FullScreenLoader label={label} />}>
      <Component />
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <ChunkErrorBoundary>
      <Routes>
        {/* Route publique - TRANSIVO Landing Page */}
        <Route
          path="/"
          element={
            <Suspense fallback={<FullScreenLoader label="Chargement de TRANSIVO…" />}>
              <LandingPage />
            </Suspense>
          }
        />

        {/* Routes Platform Admin */}
        <Route
          path="/platform-admin/login"
          element={withSuspense(PlatformLoginPage, 'Administration Transivo…')}
        />
        <Route element={<PlatformProtectedRoute />}>
          <Route
            element={withSuspense(PlatformAdminLayout, 'Administration Transivo…')}
          >
            <Route path="/platform-admin" element={<Navigate to="/platform-admin/companies" replace />} />
            <Route
              path="/platform-admin/change-password"
              element={withSuspense(PlatformChangePasswordPage)}
            />
            <Route
              path="/platform-admin/companies"
              element={withSuspense(PlatformDashboardPage, 'Chargement des entreprises…')}
            />
            <Route
              path="/platform-admin/companies/:id"
              element={withSuspense(PlatformCompanyDetailPage, 'Chargement de l\'entreprise…')}
            />
          </Route>
        </Route>

        {/* Routes publiques auth */}
        <Route element={<PublicRoute />}>
          <Route
            path="/login"
            element={withSuspense(LoginPage, 'Connexion Transivo…')}
          />
          {/* /register redirige vers /login — aucune inscription publique n'est disponible */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
        </Route>

        {/* Routes protégées (dans le layout principal ERP) */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/change-password"
            element={withSuspense(ChangePasswordPage)}
          />
          <Route
            element={withSuspense(MainLayout, 'Chargement de l\'espace Transivo…')}
          >
            {/* Dashboard ERP — accessible via /app */}
            <Route
              path="/app"
              element={
                <PermissionRoute module="dashboard" action="voir">
                  {withSuspense(DashboardPage, 'Chargement du tableau de bord…')}
                </PermissionRoute>
              }
            />
            <Route path="/app/dashboard" element={<Navigate to="/app" replace />} />

            {/* Explicit /app/ aliases for ERP modules */}
            <Route
              path="/app/vehicules"
              element={
                <PermissionRoute module="vehicules" action="voir">
                  {withSuspense(VehiclesPage, 'Chargement des véhicules…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/app/voyages"
              element={
                <PermissionRoute module="voyages" action="voir">
                  {withSuspense(VoyageListPage, 'Chargement des voyages…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/app/factures"
              element={
                <PermissionRoute module="factures" action="voir">
                  {withSuspense(InvoiceListPage, 'Chargement des factures…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/app/conducteurs"
              element={
                <PermissionRoute module="conducteurs" action="voir">
                  {withSuspense(ConducteursPage, 'Chargement des conducteurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/app/clients"
              element={
                <PermissionRoute module="clients" action="voir">
                  {withSuspense(ClientListPage, 'Chargement des clients…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/app/fournisseurs"
              element={
                <PermissionRoute module="fournisseurs" action="voir">
                  {withSuspense(FournisseurListPage, 'Chargement des fournisseurs…')}
                </PermissionRoute>
              }
            />

            {/* 403 page — accessible without permission check (it IS the denied state) */}
            <Route
              path="/403"
              element={withSuspense(ForbiddenPage)}
            />

            {/* Centre de notifications — accessible to all authenticated ERP users */}
            <Route
              path="/notifications"
              element={withSuspense(NotificationsPage, 'Chargement des notifications…')}
            />

            {/* Design system — development only */}
            <Route
              path="/design-system"
              element={
                import.meta.env.DEV ? (
                  withSuspense(DesignSystemPreviewPage, 'Chargement du design system…')
                ) : (
                  <Navigate to="/app" replace />
                )
              }
            />

            {/* Gestion des utilisateurs */}
            <Route
              path="/users"
              element={
                <PermissionRoute module="utilisateurs" action="voir">
                  {withSuspense(UsersListPage, 'Chargement des utilisateurs…')}
                </PermissionRoute>
              }
            />

            {/* Section Véhicules */}
            <Route
              path="/vehicules"
              element={
                <PermissionRoute module="vehicules" action="voir">
                  {withSuspense(VehiclesPage, 'Chargement des véhicules…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/vehicules/liste"
              element={
                <PermissionRoute module="vehicules" action="voir">
                  {withSuspense(VehicleListPage, 'Chargement de la liste des véhicules…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/vehicules/documents"
              element={
                <PermissionRoute module="documents_vehicules" action="voir">
                  {withSuspense(VehicleDocumentsPage, 'Chargement des documents véhicules…')}
                </PermissionRoute>
              }
            />

            {/* Section Conducteurs */}
            <Route
              path="/conducteurs"
              element={
                <PermissionRoute module="conducteurs" action="voir">
                  {withSuspense(ConducteursPage, 'Chargement des conducteurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/conducteurs/liste"
              element={
                <PermissionRoute module="conducteurs" action="voir">
                  {withSuspense(ConducteurListPage, 'Chargement de la liste des conducteurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/conducteurs/documents"
              element={
                <PermissionRoute module="documents_conducteurs" action="voir">
                  {withSuspense(ConducteurDocumentsPage, 'Chargement des documents conducteurs…')}
                </PermissionRoute>
              }
            />

            {/* Section Voyages */}
            <Route
              path="/voyages"
              element={
                <PermissionRoute module="voyages" action="voir">
                  {withSuspense(VoyageListPage, 'Chargement des voyages…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/voyages/liste"
              element={
                <PermissionRoute module="voyages" action="voir">
                  {withSuspense(VoyageListPage, 'Chargement des voyages…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/charges-vehicules"
              element={
                <PermissionRoute module="depenses_vehicules" action="voir">
                  {withSuspense(VehicleExpenseListPage, 'Chargement des charges véhicules…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/carnet-entretien"
              element={
                <PermissionRoute module="carnet_entretien" action="voir">
                  {withSuspense(CarnetEntretienPage, 'Chargement du carnet d\'entretien…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/traversees-maritimes"
              element={
                <PermissionRoute module="traversees_maritimes" action="voir">
                  {withSuspense(TraverseesListPage, 'Chargement des traversées maritimes…')}
                </PermissionRoute>
              }
            />

            {/* Section Clients */}
            <Route
              path="/clients"
              element={
                <PermissionRoute module="clients" action="voir">
                  {withSuspense(ClientListPage, 'Chargement des clients…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/clients/liste"
              element={
                <PermissionRoute module="clients" action="voir">
                  {withSuspense(ClientListPage, 'Chargement de la liste des clients…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/parametres-entreprise"
              element={
                <PermissionRoute module="parametres_entreprise" action="voir">
                  {withSuspense(CompanySettingsPage, 'Chargement des paramètres…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/settings/company"
              element={
                <PermissionRoute module="parametres_entreprise" action="voir">
                  {withSuspense(CompanySettingsPage, 'Chargement des paramètres…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/paiements-clients"
              element={
                <PermissionRoute module="paiements_clients" action="voir">
                  {withSuspense(CustomerPaymentsListPage, 'Chargement des paiements clients…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/factures"
              element={
                <PermissionRoute module="factures" action="voir">
                  {withSuspense(InvoiceListPage, 'Chargement des factures…')}
                </PermissionRoute>
              }
            />

            {/* Section Fournisseurs */}
            <Route
              path="/fournisseurs"
              element={
                <PermissionRoute module="fournisseurs" action="voir">
                  {withSuspense(FournisseurListPage, 'Chargement des fournisseurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/fournisseurs/liste"
              element={
                <PermissionRoute module="fournisseurs" action="voir">
                  {withSuspense(FournisseurListPage, 'Chargement de la liste des fournisseurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/dettes-fournisseurs"
              element={
                <PermissionRoute module="dettes_fournisseurs" action="voir">
                  {withSuspense(SupplierDebtsListPage, 'Chargement des dettes fournisseurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/paiements-fournisseurs"
              element={
                <PermissionRoute module="paiements_fournisseurs" action="voir">
                  {withSuspense(SupplierPaymentsListPage, 'Chargement des paiements fournisseurs…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/consommation-gasoil"
              element={
                <PermissionRoute module="bons_carburant" action="voir">
                  {withSuspense(FuelListPage, 'Chargement de la consommation carburant…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/stock-gasoil"
              element={
                <PermissionRoute module="stock_gasoil" action="voir">
                  {withSuspense(StockGasoilListPage, 'Chargement du stock gasoil…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/gestion-paiements"
              element={
                <PermissionRoute module="gestion_paiements" action="voir">
                  {withSuspense(PaymentManagementListPage, 'Chargement de la gestion des paiements…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/cheques-lettres-change"
              element={
                <PermissionRoute module="cheques_lettres_change" action="voir">
                  {withSuspense(ChequesLettresChangeListPage, 'Chargement des chèques et lettres de change…')}
                </PermissionRoute>
              }
            />

            {/* Section RH — Employés */}
            <Route
              path="/employes"
              element={
                <PermissionRoute module="employes" action="voir">
                  {withSuspense(EmployeListPage, 'Chargement des employés…')}
                </PermissionRoute>
              }
            />
            <Route
              path="/paiements-employes"
              element={
                <PermissionRoute module="paiements_employes" action="voir">
                  {withSuspense(EmployeePaymentsListPage, 'Chargement des paiements employés…')}
                </PermissionRoute>
              }
            />
          </Route>
        </Route>

        {/* 404 */}
        <Route
          path="/404"
          element={withSuspense(NotFoundPage)}
        />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </ChunkErrorBoundary>
  );
}
