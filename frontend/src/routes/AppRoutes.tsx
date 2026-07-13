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
import { RolesListPage } from '../pages/roles/RolesListPage';
import { UsersListPage } from '../pages/users/UsersListPage';

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

          {/* Modules d'administration — réservés aux administrateurs */}
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/roles" element={<RolesListPage />} />
            <Route path="/users" element={<UsersListPage />} />
          </Route>
          {/* Les autres modules métier seront ajoutés ici (Clients, Véhicules, ...) */}
        </Route>
      </Route>

      {/* 404 */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
