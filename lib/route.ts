import dynamic from 'next/dynamic';
import { PrimeIcons } from 'primereact/api';

//generals
const Pointventes = dynamic(() => import('@/app/generals/point-vente/page'), {
  ssr: false,
});

const Operations = dynamic(() => import('@/app/generals/operations/page'), {
  ssr: false,
});
const Rapport = dynamic(() => import('@/app/generals/rapports/page'), {
  ssr: false,
});

const zone = dynamic(() => import('@/app/generals/zones/page'), { ssr: false });
// const produits = dynamic(() => import("@/app/generals/produits/page"), {
//   ssr: false,
// });

// 📌 AdminPV
const AdminPVDashboard = dynamic(() => import('@/app/Admin_pv/Dashboard/page'), { ssr: false });
const AdminPVVendeurs = dynamic(() => import('@/app/Admin_pv/vendeurs/page'), {
  ssr: false,
});
const AdminPVStock = dynamic(() => import('@/app/Admin_pv/stock/page'), {
  ssr: false,
});
const AdminPVVentes = dynamic(() => import('@/app/Admin_pv/vente/page'), {
  ssr: false,
});
const AdminPVCommandes = dynamic(() => import('@/app/Admin_pv/commandes/page'), { ssr: false });

// 📌 AdminZone
const AdminZoneDashboard = dynamic(() => import('@/app/Admin_zone/Dashboard/page'), { ssr: false });
const AdminZonePointsVente = dynamic(() => import('@/app/Admin_zone/pointVentes/page'), {
  ssr: false,
});
const AdminZoneAdminsPV = dynamic(() => import('@/app/Admin_zone/AdminPvs/page'), { ssr: false });
const AdminZoneVentes = dynamic(() => import('@/app/Admin_zone/ventes/page'), {
  ssr: false,
});
const AdminZoneStock = dynamic(() => import('@/app/generals/stock/page'), {
  ssr: false,
});
const AdminZoneCommandes = dynamic(() => import('@/app/Admin_zone/commandes/page'), { ssr: false });

// 📌 SuperAdmin
const SuperAdminDashboard = dynamic(() => import('@/app/superAdmin/Dashboard/page'), {
  ssr: false,
});

const SuperAdminVentes = dynamic(() => import('@/app/superAdmin/Ventes/page'), {
  ssr: false,
});
const SuperAdminStock = dynamic(() => import('@/app/generals/stock/page'), {
  ssr: false,
});
const SuperAdminUsers = dynamic(() => import('@/app/superAdmin/Users/page'), {
  ssr: false,
});
const SuperAdminParametres = dynamic(() => import('@/app/superAdmin/Parametres/page'), {
  ssr: false,
});

// 📌 Vendeur
const VendeurDashboard = dynamic(() => import('@/app/Vendeurs/dashbord/page'), {
  ssr: false,
});
const VendeurVente = dynamic(() => import('@/app/Vendeurs/vente/page'), {
  ssr: false,
});
const VendeurHistorique = dynamic(() => import('@/app/Vendeurs/historiques/page'), { ssr: false });
const VendeurStock = dynamic(() => import('@/app/Vendeurs/stock/page'), {
  ssr: false,
});

// 📌 Routes pour les Vendeurs
const vendeurRoutes = [
  {
    path: '/vendeur/dashboard',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
    component: VendeurDashboard,
  },
  {
    path: '/vendeur/vente',
    title: 'Vente',
    icon: PrimeIcons.SHOPPING_CART,
    component: VendeurVente,
  },
  {
    path: '/vendeur/historique',
    title: 'Historique des ventes',
    icon: PrimeIcons.CALENDAR,
    component: VendeurHistorique,
  },
  {
    path: '/vendeur/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
    component: VendeurStock,
  },
];

// 📌 Routes pour Admin Point de Vente
const adminPVRoutes = [
  {
    path: '/adminpv/dashboard',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
    component: AdminPVDashboard,
  },
  {
    path: '/adminpv/vendeurs',
    title: 'Vendeurs',
    icon: PrimeIcons.USERS,
    component: AdminPVVendeurs,
  },
  {
    path: '/adminpv/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
    component: AdminPVStock,
  },
  {
    path: '/adminpv/ventes',
    title: 'Ventes',
    icon: PrimeIcons.MONEY_BILL,
    component: AdminPVVentes,
  },
  {
    path: '/adminpv/commandes',
    title: 'Commandes',
    icon: PrimeIcons.TABLET,
    component: AdminPVCommandes,
  },
];

// 📌 Routes pour Admin Zone
const adminZoneRoutes = [
  {
    path: '/adminzone/dashboard',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
    component: AdminZoneDashboard,
  },
  {
    path: '/adminzone/pointsvente',
    title: 'Points de Vente',
    icon: PrimeIcons.SHOPPING_BAG,
    component: AdminZonePointsVente,
  },
  {
    path: '/adminzone/adminspv',
    title: 'Admins PV',
    icon: PrimeIcons.USER,
    component: AdminZoneAdminsPV,
  },
  {
    path: '/adminzone/ventes',
    title: 'Ventes',
    icon: PrimeIcons.MONEY_BILL,
    component: AdminZoneVentes,
  },
  {
    path: '/adminzone/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
    component: AdminZoneStock,
  },
  {
    path: '/adminzone/commandes',
    title: 'Commandes',
    icon: PrimeIcons.TABLET,
    component: AdminZoneCommandes,
  },
];

// 📌 Routes pour SuperAdmin
const superAdminRoutes = [
  {
    path: '/superAdmin/Dashboard',
    title: 'Dashboard',
    icon: PrimeIcons.CHART_BAR,
    component: SuperAdminDashboard,
  },
  {
    path: '/generals/zones',
    title: 'Zones',
    icon: PrimeIcons.GLOBE,
    component: zone,
  },
  {
    path: '/generals/point-vente',
    title: 'Points de Vente',
    icon: PrimeIcons.SHOPPING_BAG,
    component: Pointventes,
  },
  {
    path: '/generals/produits',
    title: 'Produits',
    icon: PrimeIcons.TAG, // Représente une étiquette de prix
    component: zone,
  },
  {
    path: '/generals/operations',
    title: 'Operations',
    icon: PrimeIcons.SYNC,
    component: Operations,
  },
  {
    path: '/generals/rapports',
    title: 'rapports',
    icon: PrimeIcons.FILE,
    component: Rapport,
  },
  {
    path: '/generals/stock',
    title: 'Stock',
    icon: PrimeIcons.BOX,
    component: SuperAdminStock,
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

// 📌 Export des routes par rôle
export { vendeurRoutes, adminPVRoutes, adminZoneRoutes, superAdminRoutes };
