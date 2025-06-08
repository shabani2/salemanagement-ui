import { Routes } from './route';
import { UserRole } from './utils';

export function filterRoutesByRole(role: UserRole) {
  const base = [Routes[0]]; // Always include Dashboard
  switch (role.toLowerCase()) {
    case 'superadmin':
      return Routes;
    case 'adminregion':
      return base.concat(
        Routes.filter((r) => !['Paramètres', 'Zones', 'Dashboard'].includes(r.title))
      );

    case 'adminpointvente':
      return base.concat(
        Routes.filter((r) => ['Opérations', 'Stock', 'Rapports', 'Utilisateurs'].includes(r.title))
      );
    case 'vendeur':
      return base.concat(
        Routes.filter((r) => ['Opérations', 'Stock', 'Rapports'].includes(r.title))
      );
    case 'gerant':
      return base.concat(
        Routes.filter((r) => ['Opérations', 'Stock', 'Rapports'].includes(r.title))
      );
    default:
      return base;
  }
}
