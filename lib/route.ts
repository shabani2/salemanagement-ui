// import { PrimeIcons } from 'primereact/api';
// import SuperAdminDashboard from '@/app/page';
// import Zone from '@/app/generals/zones/page';
// import Pointventes from '@/app/generals/point-vente/page';
// import Produit from '@/app/generals/produits/page';
// import Categories from '@/app/generals/categories/page';
// import Operations from '@/app/generals/operations/page';
// import Rapport from '@/app/generals/rapports/page';
// import Stock from '@/app/generals/stock/page';
// import SuperAdminUsers from '@/app/superAdmin/Users/page';
// import SuperAdminParametres from '@/app/generals/parametre/page';
// import Commandes from '@/app/generals/commandes/page';
// import finances from '@/app/finances/page';

// export const Routes = [
//   {
//     path: '/',
//     title: 'Dashboard',
//     icon: PrimeIcons.CHART_BAR,
//     component: SuperAdminDashboard,
//   },
//   {
//     path: '/generals/zones',
//     title: 'Zones',
//     icon: PrimeIcons.GLOBE,
//     component: Zone,
//   },
//   {
//     path: '/generals/point-vente',
//     title: 'Points de Vente',
//     icon: PrimeIcons.SHOPPING_BAG,
//     component: Pointventes,
//   },
//   {
//     path: '/generals/categories',
//     title: 'Catégories',
//     icon: PrimeIcons.LIST,

//     component: Categories,
//   },
//   {
//     path: '/generals/produits',
//     title: 'Produits',
//     icon: PrimeIcons.TAG,
//     component: Produit,
//   },
//   {
//     path: '/generals/operations',
//     title: 'Opérations',
//     icon: PrimeIcons.SYNC,
//     component: Operations,
//   },
//   {
//     path: '/generals/commandes',
//     title: 'Commandes',
//     icon: PrimeIcons.SHOPPING_CART,
//     component: Commandes,
//   },
//   {
//     path: '/generals/rapports',
//     title: 'Rapports',
//     icon: PrimeIcons.FILE,
//     component: Rapport,
//   },
//   {
//     path: '/generals/stock',
//     title: 'Stock',
//     icon: PrimeIcons.BOX,
//     component: Stock,
//   },
//   {
//     path: '/superAdmin/Users',
//     title: 'Utilisateurs',
//     icon: PrimeIcons.USERS,
//     component: SuperAdminUsers,
//   },
//   {
//     path: '/superAdmin/Parametres',
//     title: 'Paramètres',
//     icon: PrimeIcons.COG,
//     component: SuperAdminParametres,
//   },
//   {
//     path: '/finances',
//     title: 'Finances',
//     icon: PrimeIcons.MONEY_BILL,
//     component: finances,
//   },
// ];




// lib/routes.ts
import dynamic from 'next/dynamic';
import { PrimeIcons } from 'primereact/api';
import { ComponentType, ReactElement } from 'react';
import RouteLoader from '@/components/ui/RouteLoader';

const withLoader = (importPath: () => Promise<any>): ComponentType =>
  dynamic(importPath, {
    loading: () => RouteLoader() as ReactElement,
  });

interface RouteItem {
  path: string;
  title: string;
  icon: string;
  component: ComponentType;
}

export const Routes: RouteItem[] = [
  {
    path: '/',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
    component: withLoader(() => import('@/app/page')),
  },
  {
    path: '/generals/zones',
    title: 'Zones',
    icon: PrimeIcons.GLOBE,
    component: withLoader(() => import('@/app/generals/zones/page')),
  },
  {
    path: '/generals/point-vente',
    title: 'Points de Vente',
    icon: PrimeIcons.SHOPPING_BAG,
    component: withLoader(() => import('@/app/generals/point-vente/page')),
  },
  {
    path: '/generals/categories',
    title: 'Catégories',
    icon: PrimeIcons.LIST,
    component: withLoader(() => import('@/app/generals/categories/page')),
  },
  {
    path: '/generals/produits',
    title: 'Produits',
    icon: PrimeIcons.TAG,
    component: withLoader(() => import('@/app/generals/produits/page')),
  },
  {
    path: '/generals/operations',
    title: 'Opérations',
    icon: PrimeIcons.SYNC,
    component: withLoader(() => import('@/app/generals/operations/page')),
  },
  {
    path: '/generals/commandes',
    title: 'Commandes',
    icon: PrimeIcons.SHOPPING_CART,
    component: withLoader(() => import('@/app/generals/commandes/page')),
  },
  {
    path: '/generals/rapports',
    title: 'Rapports',
    icon: PrimeIcons.FILE,
    component: withLoader(() => import('@/app/generals/rapports/page')),
  },
  {
    path: '/generals/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
    component: withLoader(() => import('@/app/generals/stock/page')),
  },
  {
    path: '/superAdmin/Users',
    title: 'Utilisateurs',
    icon: PrimeIcons.USERS,
    component: withLoader(() => import('@/app/superAdmin/Users/page')),
  },
  {
    path: '/superAdmin/Parametres',
    title: 'Paramètres',
    icon: PrimeIcons.COG,
    component: withLoader(() => import('@/app/generals/parametre/page')),
  },
  {
    path: '/finances',
    title: 'Finances',
    icon: PrimeIcons.MONEY_BILL,
    component: withLoader(() => import('@/app/finances/page')),
  },
];

