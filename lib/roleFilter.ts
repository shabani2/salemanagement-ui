import { menuItems } from './route';
import { UserRole } from './utils';

export function filterRoutesByRole(role: UserRole) {
  const base = [menuItems[0]]; // Toujours inclure Dashboard

  switch (role.toLowerCase()) {
    case 'superadmin':
      return menuItems;

    case 'adminregion':
      return base.concat(
        menuItems.filter((r) => !['Paramètres', 'Regions', 'Dashboard'].includes(r.title))
      );

    case 'adminpointvente':
      return base.concat(
        menuItems.filter((r) =>
          ['Opérations', 'Stock', 'Rapports', 'Utilisateurs', 'Finances', 'Commandes'].includes(
            r.title
          )
        )
      );

    case 'vendeur':
      return base.concat(
        menuItems.filter((r) => ['Opérations', 'Stock', 'Rapports', 'Finances'].includes(r.title))
      );

    case 'logisticien':
      return base.concat(menuItems.filter((r) => ['Stock', 'Commandes'].includes(r.title)));

    default:
      return base;
  }
}
