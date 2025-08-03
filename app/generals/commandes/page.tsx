'use client';

import { BreadCrumb } from 'primereact/breadcrumb';

import CommandeForm from '@/components/Commandes/CommandeForm';

const Page = () => {
  // console.log('commandes', commandes);

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
      <CommandeForm />
    </div>
  );
};

export default Page;
