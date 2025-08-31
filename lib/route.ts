import { PrimeIcons } from 'primereact/api';

export interface RouteItem {
  path: string;
  title: string;
  icon: string;
}

export const menuItems: RouteItem[] = [
  {
    path: '/',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
  },
  {
    path: '/generals/regions',
    title: 'Regions',
    icon: PrimeIcons.GLOBE,
  },
  {
    path: '/generals/point-vente',
    title: 'Points de Vente',
    icon: PrimeIcons.SHOPPING_BAG,
  },
  {
    path: '/generals/categories',
    title: 'Catégories',
    icon: PrimeIcons.LIST,
  },
  {
    path: '/generals/produits',
    title: 'Produits',
    icon: PrimeIcons.TAG,
  },
  {
    path: '/generals/operations',
    title: 'Opérations',
    icon: PrimeIcons.SYNC,
  },
  {
    path: '/generals/commandes',
    title: 'Commandes',
    icon: PrimeIcons.SHOPPING_CART,
  },
  {
    path: '/generals/rapports',
    title: 'Rapports',
    icon: PrimeIcons.FILE,
  },
  {
    path: '/generals/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
  },
  {
    path: '/superAdmin/Users',
    title: 'Utilisateurs',
    icon: PrimeIcons.USERS,
  },
  {
    path: '/superAdmin/Parametres',
    title: 'Paramètres',
    icon: PrimeIcons.COG,
  },
  {
    path: '/finances',
    title: 'Finances',
    icon: PrimeIcons.MONEY_BILL,
  },
];
