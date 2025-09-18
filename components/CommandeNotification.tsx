// app/components/CommandeNotification.tsx
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
import { iconStyle, labelStyle } from '@/lib/uiConstant/iconStyle';

export const CommandeNotification: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const commandes = useSelector((state: RootState) => selectAllCommandes(state));
  const attenteCount = commandes.filter((c) => c.statut === 'attente').length;

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion, isLogisticien } = useUserRole();

  // useEffect(() => {
  //   if (!user?.role) return;
  //   if (isSuperAdmin) {
  //     // @ts-expect-error - compat: external lib types mismatch
  //     dispatch(fetchCommandes()).then(() => {});
  //   } else if (isAdminPointVente) {
  //     dispatch(fetchCommandesByPointVente(user?.pointVente._id)).then(() => {});
  //   } else if (isAdminRegion) {
  //     dispatch(fetchCommandesByRegion(user?.region._id)).then(() => {});
  //   } else if (isLogisticien) {
  //     dispatch(fetchCommandesByUser(user?.pointVente?._id)).then(() => {});
  //   }
  // }, [dispatch]);

  useEffect(() => {
    if (!user?.role) return;
    if (isSuperAdmin) {
      // @ts-expect-error
      dispatch(fetchCommandes()).then(() => {});
    } else if (isAdminPointVente) {
      dispatch(fetchCommandesByPointVente(user?.pointVente._id)).then(() => {});
    } else if (isAdminRegion) {
      dispatch(fetchCommandesByRegion(user?.region._id)).then(() => {});
    } else if (isLogisticien) {
      // pourquoi: route = "by user", il faut l'ID utilisateur, pas le point de vente
      dispatch(fetchCommandesByUser(user?._id)).then(() => {});
    }
  }, [dispatch]);

  return (
    <Link href="/generals/commandes/listes" aria-label="Voir les commandes">
      <div className="flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <i className="pi pi-bell" style={iconStyle} aria-hidden="true" />
          {attenteCount > 0 && (
            <Badge value={attenteCount} severity="danger" className="absolute -top-2 -right-2" />
          )}
        </div>
        <span style={labelStyle} className="text-gray-800">
          voir les commandes
        </span>
      </div>
    </Link>
  );
};
