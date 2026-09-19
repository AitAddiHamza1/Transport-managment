import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { PublicRoute } from '../components/routing/PublicRoute';
// RequireRole is kept intentionally for future role-only routes. PermissionRoute is the default new pattern.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RequireRole } from '../components/routing/RequireRole';
import { PermissionRoute } from '../components/routing/PermissionRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { DesignSystemPreviewPage } from '../pages/DesignSystemPreviewPage';
// Section Véhicules
import { VehiclesPage } from '../pages/vehicles/VehiclesPage';
import { VehicleListPage } from '../pages/vehicles/VehicleListPage';
import { VehicleDocumentsPage } from '../pages/vehicles/VehicleDocumentsPage';
// Section Conducteurs
import { ConducteurListPage } from '../pages/conducteurs/ConducteurListPage';
// Section Voyages
import { VoyageListPage } from '../pages/voyages/VoyageListPage';
// Section Traversées Maritimes
import { TraverseesListPage } from '../pages/traversees-maritimes/TraverseesListPage';
// Section Clients
import { ClientListPage } from '../pages/clients/ClientListPage';
// Section Charges Véhicules
import { VehicleExpenseListPage } from '../pages/charges-vehicules/VehicleExpenseListPage';
import { CarnetEntretienPage } from '../pages/carnet-entretien/CarnetEntretienPage';
// Section Fournisseurs
import { FournisseurListPage } from '../pages/fournisseurs/FournisseurListPage';
// Sections (pages placeholder)
import { AdministrativeExpensesPage } from '../pages/sections/AdministrativeExpensesPage';
import { CustomerPaymentsListPage } from '../pages/paiements-clients/CustomerPaymentsListPage';
import { InvoiceListPage } from '../pages/factures/InvoiceListPage';
import { SupplierDebtsPage } from '../pages/sections/SupplierDebtsPage';
import { SupplierPaymentsPage } from '../pages/sections/SupplierPaymentsPage';
import { FuelListPage } from '../pages/carburant/FuelListPage';
import { StockGasoilListPage } from '../pages/stock-gasoil/StockGasoilListPage';
import { PaymentsPage } from '../pages/sections/PaymentsPage';
import { ChequesLettresChangeListPage } from '../pages/cheques-lettres-change/ChequesLettresChangeListPage';
import { CompanySettingsPage } from '../pages/settings/CompanySettingsPage';
import { EmployeListPage } from '../pages/employes/EmployeListPage';
import { EmployeePaymentsListPage } from '../pages/paiements-employes/EmployeePaymentsListPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';

// Section Platform Admin
import { PlatformProtectedRoute } from '../components/routing/PlatformProtectedRoute';
import { PlatformAdminLayout } from '../components/platform-admin/PlatformAdminLayout';
import { PlatformLoginPage } from '../pages/platform-admin/PlatformLoginPage';
import { PlatformChangePasswordPage } from '../pages/platform-admin/PlatformChangePasswordPage';
import { PlatformDashboardPage } from '../pages/platform-admin/PlatformDashboardPage';
import { PlatformCompanyDetailPage } from '../pages/platform-admin/PlatformCompanyDetailPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Routes Platform Admin */}
      <Route path="/platform-admin/login" element={<PlatformLoginPage />} />
      <Route element={<PlatformProtectedRoute />}>
        <Route element={<PlatformAdminLayout />}>
          <Route path="/platform-admin" element={<Navigate to="/platform-admin/companies" replace />} />
          <Route path="/platform-admin/change-password" element={<PlatformChangePasswordPage />} />
          <Route path="/platform-admin/companies" element={<PlatformDashboardPage />} />
          <Route path="/platform-admin/companies/:id" element={<PlatformCompanyDetailPage />} />
        </Route>
      </Route>

      {/* Routes publiques */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        {/* /register redirige vers /login — aucune inscription publique n'est disponible */}
        <Route path="/register" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Routes protégées (dans le layout principal) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<MainLayout />}>

          {/* Dashboard — permission-controlled: dashboard/voir is granted per profile */}
          <Route
            path="/"
            element={
              <PermissionRoute module="dashboard" action="voir">
                <DashboardPage />
              </PermissionRoute>
            }
          />

          {/* 403 page — accessible without permission check (it IS the denied state) */}
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Centre de notifications — accessible to all authenticated ERP users */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Design system — development only */}
          <Route
            path="/design-system"
            element={
              import.meta.env.DEV ? (
                <DesignSystemPreviewPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Gestion des utilisateurs */}
          <Route
            path="/users"
            element={
              <PermissionRoute module="utilisateurs" action="voir">
                <UsersListPage />
              </PermissionRoute>
            }
          />

          {/* Section Véhicules */}
          <Route
            path="/vehicules"
            element={
              <PermissionRoute module="vehicules" action="voir">
                <VehiclesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/vehicules/liste"
            element={
              <PermissionRoute module="vehicules" action="voir">
                <VehicleListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/vehicules/documents"
            element={
              <PermissionRoute module="documents_vehicules" action="voir">
                <VehicleDocumentsPage />
              </PermissionRoute>
            }
          />

          {/* Section Conducteurs */}
          <Route
            path="/conducteurs"
            element={
              <PermissionRoute module="conducteurs" action="voir">
                <ConducteurListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/conducteurs/liste"
            element={
              <PermissionRoute module="conducteurs" action="voir">
                <ConducteurListPage />
              </PermissionRoute>
            }
          />
          {/* Section Voyages */}
          <Route
            path="/voyages"
            element={
              <PermissionRoute module="voyages" action="voir">
                <VoyageListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/voyages/liste"
            element={
              <PermissionRoute module="voyages" action="voir">
                <VoyageListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/charges-vehicules"
            element={
              <PermissionRoute module="depenses_vehicules" action="voir">
                <VehicleExpenseListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/carnet-entretien"
            element={
              <PermissionRoute module="carnet_entretien" action="voir">
                <CarnetEntretienPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/traversees-maritimes"
            element={
              <PermissionRoute module="traversees_maritimes" action="voir">
                <TraverseesListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/charges-administratives"
            element={
              <PermissionRoute module="depenses_administratives" action="voir">
                <AdministrativeExpensesPage />
              </PermissionRoute>
            }
          />
          {/* Section Clients */}
          <Route
            path="/clients"
            element={
              <PermissionRoute module="clients" action="voir">
                <ClientListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/clients/liste"
            element={
              <PermissionRoute module="clients" action="voir">
                <ClientListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/parametres-entreprise"
            element={
              <PermissionRoute module="parametres_entreprise" action="voir">
                <CompanySettingsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/settings/company"
            element={
              <PermissionRoute module="parametres_entreprise" action="voir">
                <CompanySettingsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/paiements-clients"
            element={
              <PermissionRoute module="paiements_clients" action="voir">
                <CustomerPaymentsListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/factures"
            element={
              <PermissionRoute module="factures" action="voir">
                <InvoiceListPage />
              </PermissionRoute>
            }
          />
          {/* Section Fournisseurs */}
          <Route
            path="/fournisseurs"
            element={
              <PermissionRoute module="fournisseurs" action="voir">
                <FournisseurListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/fournisseurs/liste"
            element={
              <PermissionRoute module="fournisseurs" action="voir">
                <FournisseurListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/dettes-fournisseurs"
            element={
              <PermissionRoute module="dettes_fournisseurs" action="voir">
                <SupplierDebtsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/paiements-fournisseurs"
            element={
              <PermissionRoute module="paiements_fournisseurs" action="voir">
                <SupplierPaymentsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/consommation-gasoil"
            element={
              <PermissionRoute module="bons_carburant" action="voir">
                <FuelListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/stock-gasoil"
            element={
              <PermissionRoute module="stock_gasoil" action="voir">
                <StockGasoilListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/gestion-paiements"
            element={
              <PermissionRoute module="gestion_paiements" action="voir">
                <PaymentsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/cheques-lettres-change"
            element={
              <PermissionRoute module="cheques_lettres_change" action="voir">
                <ChequesLettresChangeListPage />
              </PermissionRoute>
            }
          />
          {/* Section RH — Employés */}
          <Route
            path="/employes"
            element={
              <PermissionRoute module="employes" action="voir">
                <EmployeListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/paiements-employes"
            element={
              <PermissionRoute module="paiements_employes" action="voir">
                <EmployeePaymentsListPage />
              </PermissionRoute>
            }
          />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
