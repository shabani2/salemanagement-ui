/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import PrivilegiesDashboard from '@/components/dashboards/Privilegies/PrivilegiesDashboard';
import VendeurDashboard from '@/components/dashboards/VendeurDashboard';
import AdminPointVenteDashboard from '@/components/dashboards/AdminPointVenteDashboard';
//import LogisticienDashboard from '@/components/dashboards/LogisticienDashboard';
import NotDefined from './NotDifined';
import GerantDashboard from '@/components/dashboards/GerantDashboard';

export default function Page() {
  //const dispatch = useDispatch<AppDispatch>();

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  // Fonction de rendu dynamique du tableau de bord
  const renderDashboard = () => {
    switch (user?.role) {
      case 'SuperAdmin':
      case 'AdminRegion':
        return <PrivilegiesDashboard />;
      case 'AdminPointVente':
        return <AdminPointVenteDashboard />;
      case 'Vendeur':
        return <VendeurDashboard />;
      case 'Logisticien':
        return <GerantDashboard />;
      default:
        return <NotDefined />;
    }
  };

  return (
    <div>
      <div className="mt-6">{renderDashboard()}</div>
    </div>
  );
}
