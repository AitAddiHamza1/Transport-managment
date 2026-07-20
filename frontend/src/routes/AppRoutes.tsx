import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { PublicRoute } from '../components/routing/PublicRoute';
// RequireRole is kept intentionally for future role-only routes. PermissionRoute is the default new pattern.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RequireRole } from '../components/routing/RequireRole';
import { PermissionRoute } from '../components/routing/PermissionRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { DesignSystemPreviewPage } from '../pages/DesignSystemPreviewPage';
// Section Véhicules
import { VehiclesPage } from '../pages/vehicles/VehiclesPage';
import { VehicleListPage } from '../pages/vehicles/VehicleListPage';
import { VehicleDocumentsPage } from '../pages/vehicles/VehicleDocumentsPage';
// Sections (pages placeholder)
import { DriversPage } from '../pages/sections/DriversPage';
import { TripsPage } from '../pages/sections/TripsPage';
import { VehicleExpensesPage } from '../pages/sections/VehicleExpensesPage';
import { AdministrativeExpensesPage } from '../pages/sections/AdministrativeExpensesPage';
import { ClientsPage } from '../pages/sections/ClientsPage';
import { ReceivablesPage } from '../pages/sections/ReceivablesPage';
import { CustomerPaymentsPage } from '../pages/sections/CustomerPaymentsPage';
import { InvoicesPage } from '../pages/sections/InvoicesPage';
import { SuppliersPage } from '../pages/sections/SuppliersPage';
import { SupplierDebtsPage } from '../pages/sections/SupplierDebtsPage';
import { SupplierPaymentsPage } from '../pages/sections/SupplierPaymentsPage';
import { FuelPage } from '../pages/sections/FuelPage';
import { PaymentsPage } from '../pages/sections/PaymentsPage';


export function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Routes protégées (dans le layout principal) */}
      <Route element={<ProtectedRoute />}>
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

          {/* Autres sections */}
          <Route
            path="/conducteurs"
            element={
              <PermissionRoute module="conducteurs" action="voir">
                <DriversPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/voyages"
            element={
              <PermissionRoute module="voyages" action="voir">
                <TripsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/charges-vehicules"
            element={
              <PermissionRoute module="depenses_vehicules" action="voir">
                <VehicleExpensesPage />
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
          <Route
            path="/clients"
            element={
              <PermissionRoute module="clients" action="voir">
                <ClientsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/creances"
            element={
              <PermissionRoute module="creances_clients" action="voir">
                <ReceivablesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/paiements-clients"
            element={
              <PermissionRoute module="paiements_clients" action="voir">
                <CustomerPaymentsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/factures"
            element={
              <PermissionRoute module="factures" action="voir">
                <InvoicesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/fournisseurs"
            element={
              <PermissionRoute module="fournisseurs" action="voir">
                <SuppliersPage />
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
                <FuelPage />
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
        </Route>
      </Route>

      {/* 404 */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
