/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

import { PointVente } from '@/Models/pointVenteType';

import { BreadCrumb } from 'primereact/breadcrumb';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import {
  fetchMouvementsStock,
  fetchMouvementStockByPointVenteId,
  selectAllMouvementsStock,
  fetchMouvementStockByRegionId,
} from '@/stores/slices/mvtStock/mvtStock';
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
