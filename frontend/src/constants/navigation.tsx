import { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';
import RouteIcon from '@mui/icons-material/Route';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BuildIcon from '@mui/icons-material/Build';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import PaidIcon from '@mui/icons-material/Paid';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

export interface NavLeaf {
  moduleKey: string;
  label: string;
  to: string;
  icon: ReactNode;
  action?: string; // default is 'voir'
}

export interface NavGroup {
  id: string;
  label: string;
  icon: ReactNode;
  to: string;
  children: NavLeaf[];
}

export type NavEntry = { kind: 'leaf'; leaf: NavLeaf } | { kind: 'group'; group: NavGroup };

export const NAVIGATION_ITEMS: NavEntry[] = [
  { kind: 'leaf', leaf: { moduleKey: 'dashboard', label: 'Tableau de bord', to: '/', icon: <DashboardIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'utilisateurs', label: 'Utilisateurs', to: '/users', icon: <ManageAccountsIcon /> } },
  {
    kind: 'group',
    group: {
      id: 'vehicules',
      label: 'Véhicules',
      icon: <LocalShippingIcon />,
      to: '/vehicules',
      children: [
        { moduleKey: 'vehicules', label: 'Liste des véhicules', to: '/vehicules/liste', icon: <DescriptionIcon /> },
        { moduleKey: 'documents_vehicules', label: 'Documents véhicules', to: '/vehicules/documents', icon: <DescriptionIcon /> },
      ],
    },
  },
  { kind: 'leaf', leaf: { moduleKey: 'conducteurs', label: 'Conducteurs', to: '/conducteurs', icon: <AssignmentIndIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'voyages', label: 'Voyages', to: '/voyages', icon: <RouteIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'depenses_vehicules', label: 'Charges véhicules', to: '/charges-vehicules', icon: <BuildIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'depenses_administratives', label: 'Charges administratives', to: '/charges-administratives', icon: <ReceiptLongIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'clients', label: 'Clients', to: '/clients', icon: <PeopleIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'creances_clients', label: 'Créances clients', to: '/creances', icon: <RequestQuoteIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'paiements_clients', label: 'Paiements clients', to: '/paiements-clients', icon: <PaymentsIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'factures', label: 'Factures', to: '/factures', icon: <ReceiptIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'fournisseurs', label: 'Fournisseurs', to: '/fournisseurs', icon: <StorefrontIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'dettes_fournisseurs', label: 'Dettes fournisseurs', to: '/dettes-fournisseurs', icon: <MoneyOffIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'paiements_fournisseurs', label: 'Paiements fournisseurs', to: '/paiements-fournisseurs', icon: <PaidIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'bons_carburant', label: 'Consommation gasoil', to: '/consommation-gasoil', icon: <LocalGasStationIcon /> } },
  { kind: 'leaf', leaf: { moduleKey: 'gestion_paiements', label: 'Gestion paiements', to: '/gestion-paiements', icon: <AccountBalanceWalletIcon /> } },
];
