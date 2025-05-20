import { PrimeIcons } from 'primereact/api';
import SuperAdminDashboard from '@/app/page';
import Zone from '@/app/generals/zones/page';
import Pointventes from '@/app/generals/point-vente/page';
import Produit from '@/app/generals/produits/page';
import Categories from '@/app/generals/categories/page';
import Operations from '@/app/generals/operations/page';
import Rapport from '@/app/generals/rapports/page';
import Stock from '@/app/generals/stock/page';
import SuperAdminUsers from '@/app/superAdmin/Users/page';
import SuperAdminParametres from '@/app/generals/parametre/page';

export const Routes = [
  {
    path: '/',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
    component: SuperAdminDashboard,
  },
  {
    path: '/generals/zones',
    title: 'Zones',
    icon: PrimeIcons.GLOBE,
    component: Zone,
  },
  {
    path: '/generals/point-vente',
    title: 'Points de Vente',
    icon: PrimeIcons.SHOPPING_BAG,
    component: Pointventes,
  },
  {
    path: '/generals/categories',
    title: 'Catégories',
    icon: PrimeIcons.LIST,

    component: Categories,
  },
  {
    path: '/generals/produits',
    title: 'Produits',
    icon: PrimeIcons.TAG,
    component: Produit,
  },
  {
    path: '/generals/operations',
    title: 'Opérations',
    icon: PrimeIcons.SYNC,
    component: Operations,
  },
  {
    path: '/generals/rapports',
    title: 'Rapports',
    icon: PrimeIcons.FILE,
    component: Rapport,
  },
  {
    path: '/generals/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
    component: Stock,
  },
  {
    path: '/superAdmin/Users',
    title: 'Utilisateurs',
    icon: PrimeIcons.USERS,
    component: SuperAdminUsers,
  },
  {
    path: '/superAdmin/Parametres',
    title: 'Paramètres',
    icon: PrimeIcons.COG,
    component: SuperAdminParametres,
  },
];
