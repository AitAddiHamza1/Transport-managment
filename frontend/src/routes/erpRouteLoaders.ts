import type { ComponentType } from 'react';
import type { ModuleKey } from '../lib/permissions/types';

export type RouteLoader = () => Promise<{ default: ComponentType<unknown> }>;

/**
 * Individual typed dynamic import loaders for ERP routes.
 * Used by React.lazy() in AppRoutes.tsx and reused by the background prefetcher.
 */

// Immediate Core Pages (Not in background queue)
export const loadDashboardPage = () =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage as ComponentType<unknown> }));

// Tier 1: Voyages & Véhicules
export const loadVoyageListPage = () =>
  import('../pages/voyages/VoyageListPage').then((m) => ({ default: m.VoyageListPage as ComponentType<unknown> }));
export const loadVehicleListPage = () =>
  import('../pages/vehicles/VehicleListPage').then((m) => ({ default: m.VehicleListPage as ComponentType<unknown> }));
export const loadVehiclesPage = () =>
  import('../pages/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage as ComponentType<unknown> }));

// Tier 2: Factures, Clients & Conducteurs
export const loadInvoiceListPage = () =>
  import('../pages/factures/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage as ComponentType<unknown> }));
export const loadClientListPage = () =>
  import('../pages/clients/ClientListPage').then((m) => ({ default: m.ClientListPage as ComponentType<unknown> }));
export const loadConducteurListPage = () =>
  import('../pages/conducteurs/ConducteurListPage').then((m) => ({ default: m.ConducteurListPage as ComponentType<unknown> }));
export const loadConducteursPage = () =>
  import('../pages/conducteurs/ConducteursPage').then((m) => ({ default: m.ConducteursPage as ComponentType<unknown> }));

// Tier 3: Bons carburant, Stock gasoil, Dépenses véhicules & Carnet d'entretien
export const loadFuelListPage = () =>
  import('../pages/carburant/FuelListPage').then((m) => ({ default: m.FuelListPage as ComponentType<unknown> }));
export const loadStockGasoilListPage = () =>
  import('../pages/stock-gasoil/StockGasoilListPage').then((m) => ({ default: m.StockGasoilListPage as ComponentType<unknown> }));
export const loadVehicleExpenseListPage = () =>
  import('../pages/charges-vehicules/VehicleExpenseListPage').then((m) => ({ default: m.VehicleExpenseListPage as ComponentType<unknown> }));
export const loadCarnetEntretienPage = () =>
  import('../pages/carnet-entretien/CarnetEntretienPage').then((m) => ({ default: m.CarnetEntretienPage as ComponentType<unknown> }));

// Tier 4: Fournisseurs, Paiements clients, Paiements fournisseurs & Employés
export const loadFournisseurListPage = () =>
  import('../pages/fournisseurs/FournisseurListPage').then((m) => ({ default: m.FournisseurListPage as ComponentType<unknown> }));
export const loadCustomerPaymentsListPage = () =>
  import('../pages/paiements-clients/CustomerPaymentsListPage').then((m) => ({ default: m.CustomerPaymentsListPage as ComponentType<unknown> }));
export const loadSupplierPaymentsListPage = () =>
  import('../pages/paiements-fournisseurs/SupplierPaymentsListPage').then((m) => ({ default: m.SupplierPaymentsListPage as ComponentType<unknown> }));
export const loadSupplierDebtsListPage = () =>
  import('../pages/dettes-fournisseurs/SupplierDebtsListPage').then((m) => ({ default: m.SupplierDebtsListPage as ComponentType<unknown> }));
export const loadEmployeListPage = () =>
  import('../pages/employes/EmployeListPage').then((m) => ({ default: m.EmployeListPage as ComponentType<unknown> }));
export const loadEmployeePaymentsListPage = () =>
  import('../pages/paiements-employes/EmployeePaymentsListPage').then((m) => ({ default: m.EmployeePaymentsListPage as ComponentType<unknown> }));

// Tier 5: Documents, Traversées maritimes, Chèques/LC, Trésorerie, Utilisateurs, Paramètres & Notifications
export const loadVehicleDocumentsPage = () =>
  import('../pages/vehicles/VehicleDocumentsPage').then((m) => ({ default: m.VehicleDocumentsPage as ComponentType<unknown> }));
export const loadConducteurDocumentsPage = () =>
  import('../pages/conducteurs/ConducteurDocumentsPage').then((m) => ({ default: m.ConducteurDocumentsPage as ComponentType<unknown> }));
export const loadTraverseesListPage = () =>
  import('../pages/traversees-maritimes/TraverseesListPage').then((m) => ({ default: m.TraverseesListPage as ComponentType<unknown> }));
export const loadChequesLettresChangeListPage = () =>
  import('../pages/cheques-lettres-change/ChequesLettresChangeListPage').then((m) => ({ default: m.ChequesLettresChangeListPage as ComponentType<unknown> }));
export const loadPaymentManagementListPage = () =>
  import('../pages/gestion-paiements/PaymentManagementListPage').then((m) => ({ default: m.PaymentManagementListPage as ComponentType<unknown> }));
export const loadUsersListPage = () =>
  import('../pages/users/UsersListPage').then((m) => ({ default: m.UsersListPage as ComponentType<unknown> }));
export const loadCompanySettingsPage = () =>
  import('../pages/settings/CompanySettingsPage').then((m) => ({ default: m.CompanySettingsPage as ComponentType<unknown> }));
export const loadNotificationsPage = () =>
  import('../pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage as ComponentType<unknown> }));

/**
 * Definition of an ERP route module eligible for background prefetching.
 */
export interface ErpPrefetchItem {
  id: string;
  moduleKey: ModuleKey | null;
  load: RouteLoader;
  tier: 1 | 2 | 3 | 4 | 5;
  path: string;
}

/**
 * Ordered priority list for background prefetching.
 * Note: MainLayout and DashboardPage are intentionally excluded as they are loaded immediately on auth.
 */
export const ERP_PREFETCH_ITEMS: readonly ErpPrefetchItem[] = [
  // Tier 1: Core Operations
  { id: 'voyages', moduleKey: 'voyages', load: loadVoyageListPage, tier: 1, path: '/voyages' },
  { id: 'vehicules_liste', moduleKey: 'vehicules', load: loadVehicleListPage, tier: 1, path: '/vehicules/liste' },
  { id: 'vehicules_hub', moduleKey: 'vehicules', load: loadVehiclesPage, tier: 1, path: '/vehicules' },

  // Tier 2: Billing, Clients & Drivers
  { id: 'factures', moduleKey: 'factures', load: loadInvoiceListPage, tier: 2, path: '/factures' },
  { id: 'clients', moduleKey: 'clients', load: loadClientListPage, tier: 2, path: '/clients' },
  { id: 'conducteurs_liste', moduleKey: 'conducteurs', load: loadConducteurListPage, tier: 2, path: '/conducteurs/liste' },
  { id: 'conducteurs_hub', moduleKey: 'conducteurs', load: loadConducteursPage, tier: 2, path: '/conducteurs' },

  // Tier 3: Fleet Maintenance, Gasoil & Expenses
  { id: 'bons_carburant', moduleKey: 'bons_carburant', load: loadFuelListPage, tier: 3, path: '/consommation-gasoil' },
  { id: 'stock_gasoil', moduleKey: 'stock_gasoil', load: loadStockGasoilListPage, tier: 3, path: '/stock-gasoil' },
  { id: 'depenses_vehicules', moduleKey: 'depenses_vehicules', load: loadVehicleExpenseListPage, tier: 3, path: '/charges-vehicules' },
  { id: 'carnet_entretien', moduleKey: 'carnet_entretien', load: loadCarnetEntretienPage, tier: 3, path: '/carnet-entretien' },

  // Tier 4: Suppliers, Payments & HR
  { id: 'fournisseurs', moduleKey: 'fournisseurs', load: loadFournisseurListPage, tier: 4, path: '/fournisseurs' },
  { id: 'paiements_clients', moduleKey: 'paiements_clients', load: loadCustomerPaymentsListPage, tier: 4, path: '/paiements-clients' },
  { id: 'paiements_fournisseurs', moduleKey: 'paiements_fournisseurs', load: loadSupplierPaymentsListPage, tier: 4, path: '/paiements-fournisseurs' },
  { id: 'dettes_fournisseurs', moduleKey: 'dettes_fournisseurs', load: loadSupplierDebtsListPage, tier: 4, path: '/dettes-fournisseurs' },
  { id: 'employes', moduleKey: 'employes', load: loadEmployeListPage, tier: 4, path: '/employes' },
  { id: 'paiements_employes', moduleKey: 'paiements_employes', load: loadEmployeePaymentsListPage, tier: 4, path: '/paiements-employes' },

  // Tier 5: Documents, Maritime, Treasury, Settings & Notifications
  { id: 'documents_vehicules', moduleKey: 'documents_vehicules', load: loadVehicleDocumentsPage, tier: 5, path: '/vehicules/documents' },
  { id: 'documents_conducteurs', moduleKey: 'documents_conducteurs', load: loadConducteurDocumentsPage, tier: 5, path: '/conducteurs/documents' },
  { id: 'traversees_maritimes', moduleKey: 'traversees_maritimes', load: loadTraverseesListPage, tier: 5, path: '/traversees-maritimes' },
  { id: 'cheques_lettres_change', moduleKey: 'cheques_lettres_change', load: loadChequesLettresChangeListPage, tier: 5, path: '/cheques-lettres-change' },
  { id: 'gestion_paiements', moduleKey: 'gestion_paiements', load: loadPaymentManagementListPage, tier: 5, path: '/gestion-paiements' },
  { id: 'utilisateurs', moduleKey: 'utilisateurs', load: loadUsersListPage, tier: 5, path: '/users' },
  { id: 'parametres_entreprise', moduleKey: 'parametres_entreprise', load: loadCompanySettingsPage, tier: 5, path: '/parametres-entreprise' },
  { id: 'notifications', moduleKey: null, load: loadNotificationsPage, tier: 5, path: '/notifications' },
] as const;

