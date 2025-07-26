'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BreadCrumb } from 'primereact/breadcrumb';

import { fetchCommandes } from '@/stores/slices/commandes/commandeSlice';
import { AppDispatch, RootState } from '@/stores/store';

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const commandes = useSelector((state: RootState) => state.commandes);

  useEffect(() => {
    dispatch(fetchCommandes());
  }, [dispatch]);

  console.log('commandes', commandes);

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mt-5 mb-5">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Commandes' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-500">Gestion des Commandes</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">hello world</div>
    </div>
  );
};

export default Page;
