import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { PublicRoute } from '../components/routing/PublicRoute';
import { RequireRole } from '../components/routing/RequireRole';
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
          <Route path="/" element={<DashboardPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
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

          {/* Gestion des utilisateurs — réservée à l'Administrateur Général */}
          <Route element={<RequireRole roles={['ADMIN_GENERAL']} />}>
            <Route path="/users" element={<UsersListPage />} />
          </Route>

          {/* Section Véhicules (menu parent) */}
          <Route path="/vehicules" element={<VehiclesPage />} />
          <Route path="/vehicules/liste" element={<VehicleListPage />} />
          <Route path="/vehicules/documents" element={<VehicleDocumentsPage />} />

          {/* Autres sections (structure de navigation) */}
          <Route path="/conducteurs" element={<DriversPage />} />
          <Route path="/voyages" element={<TripsPage />} />
          <Route path="/charges-vehicules" element={<VehicleExpensesPage />} />
          <Route path="/charges-administratives" element={<AdministrativeExpensesPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/creances" element={<ReceivablesPage />} />
          <Route path="/paiements-clients" element={<CustomerPaymentsPage />} />
          <Route path="/factures" element={<InvoicesPage />} />
          <Route path="/fournisseurs" element={<SuppliersPage />} />
          <Route path="/dettes-fournisseurs" element={<SupplierDebtsPage />} />
          <Route path="/paiements-fournisseurs" element={<SupplierPaymentsPage />} />
          <Route path="/consommation-gasoil" element={<FuelPage />} />
          <Route path="/gestion-paiements" element={<PaymentsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
