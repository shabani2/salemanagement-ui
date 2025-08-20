/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect } from 'react';
import { Badge } from 'primereact/badge';
import Link from 'next/link';
import { AppDispatch, RootState } from '@/stores/store';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCommandes,
  fetchCommandesByPointVente,
  fetchCommandesByRegion,
  fetchCommandesByUser,
  selectAllCommandes,
} from '@/stores/slices/commandes/commandeSlice';
import { useUserRole } from '@/hooks/useUserRole';

export const CommandeNotification: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const commandes = useSelector((state: RootState) => selectAllCommandes(state));
  const attenteCount = commandes.filter((c) => c.statut === 'attente').length;

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion, isLogisticien } = useUserRole();

  useEffect(() => {
    if (!user?.role) return;
    if (isSuperAdmin) {
      // @ts-expect-error - compat: external lib types mismatch
      dispatch(fetchCommandes()).then((resp) => {
        console.log('Commandes fetched:', resp.payload);
      });
    } else if (isAdminPointVente) {
      dispatch(fetchCommandesByPointVente(user?.pointVente._id)).then((resp) => {
        console.log('Commandes by point de vente:', resp.payload);
      });
    } else if (isAdminRegion) {
      dispatch(fetchCommandesByRegion(user?.region._id)).then((resp) => {
        console.log('Commandes by region:', resp.payload);
      });
    } else if (isLogisticien) {
      dispatch(fetchCommandesByUser(user?.pointVente?._id)).then((resp) => {
        console.log('Commandes by user:', resp.payload);
      });
    }
  }, [dispatch]);

  return (
    <Link href="/generals/commandes/listes">
      <div className="relative cursor-pointer">
        <i className="pi pi-bell text-green-700" style={{ fontSize: '26px' }} />
        {attenteCount > 0 && (
          <Badge value={attenteCount} severity="danger" className="absolute -top-2 -right-2" />
        )}
      </div>
    </Link>
  );
};
