export type DashboardPreset =
  | 'AUJOURDHUI'
  | 'CE_MOIS'
  | 'CE_TRIMESTRE'
  | 'CETTE_ANNEE'
  | 'PERSONNALISE';

export interface DashboardOverviewParams {
  preset?: DashboardPreset;
  dateDebut?: string;
  dateFin?: string;
  months?: number;
}

export interface DashboardOverviewResponse {
  period: {
    preset: DashboardPreset;
    dateDebut: string;
    dateFin: string;
  };
  company: {
    name: string;
    currency: string;
  };
  isPeriodEmpty: boolean;
  metadata: {
    isPartial: boolean;
    excludedSources: string[];
  };
  visibility: Record<string, boolean>;
  financial: {
    totalInvoiced: string | null;
    clientReceipts: string | null;
    supplierOutflow: string | null;
    employeeOutflow: string | null;
    adminExpenseOutflow: string | null;
    vehicleExpenseOutflow: string | null;
    fuelOutflow: string | null;
    totalOutflow: string | null;
    netCashFlow: string | null;
    outstandingAmount: string | null;
  };
  operations: {
    tripsCompleted: number | null;
    activeVehicles: number | null;
    activeDrivers: number | null;
  };
  risks: {
    expiredDocuments: number | null;
    expiringDocuments: number | null;
    overdueSupplierDebts: number | null;
  };
}

export interface DashboardChartsResponse {
  cashFlow: Array<{
    period: string; // "YYYY-MM"
    in: string;
    out: string;
    net: string;
  }>;
  tripsByStatus: Array<{
    status: string;
    count: number;
    label: string;
  }>;
  expensesBySource: Array<{
    source: string;
    amount: string;
    label: string;
  }>;
  documentsByStatus: Array<{
    status: 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';
    count: number;
    label: string;
  }>;
}

export interface DashboardAlertItem {
  id: string;
  type: 'EXPIRED_DOCUMENT' | 'EXPIRING_DOCUMENT' | 'OVERDUE_SUPPLIER_DEBT';
  severity: 'error' | 'warning';
  title: string;
  description: string;
  count: number;
  targetRoute: string;
}

export interface DashboardRecentActivityItem {
  activityId: string;
  type:
    | 'INVOICE_CREATED'
    | 'CLIENT_PAYMENT_RECEIVED'
    | 'SUPPLIER_PAYMENT_RECORDED'
    | 'EMPLOYEE_PAYMENT_RECORDED'
    | 'ADMIN_EXPENSE_CREATED'
    | 'TRIP_COMPLETED'
    | 'DOCUMENT_ADDED';
  date: string;
  title: string;
  description: string;
  amount: string | null;
  iconKey:
    | 'invoice'
    | 'client_payment'
    | 'supplier_payment'
    | 'employee_payment'
    | 'admin_expense'
    | 'trip'
    | 'document';
  tone: 'info' | 'success' | 'warning' | 'error' | 'primary';
  sourceRoute: string;
  timestampPrecision: 'DATETIME' | 'DATE';
}
