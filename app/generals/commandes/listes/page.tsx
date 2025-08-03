'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Commande } from '@/Models/commandeType';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import { AppDispatch, RootState } from '@/stores/store';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCommandes,
  fetchCommandesByPointVente,
  fetchCommandesByRegion,
  fetchCommandesByUser,
  selectAllCommandes,
  selectCommandeStatus,
  updateCommande,
} from '@/stores/slices/commandes/commandeSlice';
import { CommandeProduit } from '@/Models/CommandeProduitType';
import { useUserRole } from '@/hooks/useUserRole';
import { BreadCrumb } from 'primereact/breadcrumb';

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const commandes = useSelector((state: RootState) => selectAllCommandes(state));
  const loading = useSelector((state: RootState) => selectCommandeStatus(state)) === 'loading';
  const toast = useRef<Toast>(null);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [visible, setVisible] = useState(false);
  type CommandeProduitWithTempChecked = CommandeProduit & { _tempChecked?: boolean };
  const [produitsLivrables, setProduitsLivrables] = useState<CommandeProduitWithTempChecked[]>([]);
  const [menuRefs, setMenuRefs] = useState<{ [key: string]: Menu | null }>({});
  const [saving, setSaving] = useState(false);
  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

  useEffect(() => {
    if (!user?.role) return;
    if (isSuperAdmin) {
      dispatch(fetchCommandes());
    } else if (isAdminPointVente) {
      dispatch(fetchCommandesByPointVente(user?.pointVente._id));
    } else if (isAdminRegion) {
      dispatch(fetchCommandesByRegion(user?.region._id));
    } else if (user.role === 'Logisticien') {
      dispatch(fetchCommandesByUser(user?.pointVente?._id));
    }
  }, [dispatch]);

  const showMenu = (event: React.MouseEvent, commandeId: string) => {
    if (menuRefs[commandeId]) {
      menuRefs[commandeId].toggle(event);
    }
  };

  const handleOpenModal = (commande: Commande) => {
    setSelectedCommande(commande);
    setProduitsLivrables(
      commande.produits.map((p) => ({
        ...p,
        _tempChecked: p.statut === 'livré',
      }))
    );
    setVisible(true);
  };

  const handleCheck = (checked: boolean, index: number) => {
    setProduitsLivrables((prev) =>
      prev.map((p, i) => (i === index ? { ...p, _tempChecked: checked } : p))
    );
  };

  const effectuerLivraison = async () => {
    if (!selectedCommande) return;

    setSaving(true);
    try {
      const updatedProduits = produitsLivrables.map((p) => ({
        ...p,
        statut: p._tempChecked ? 'livré' : p.statut,
      }));

      const updatedCommande = {
        ...selectedCommande,
        produits: updatedProduits,
      };

      await dispatch(updateCommande(updatedCommande)).unwrap();

      toast.current?.show({
        severity: 'success',
        summary: 'Livraison effectuée',
        detail: 'Les produits sélectionnés ont été livrés.',
        life: 3000,
      });
      setVisible(false);
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'enregistrement",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const actionTemplate = (row: Commande) => (
    <>
      <Button
        icon="pi pi-ellipsis-v"
        className="p-button-text"
        onClick={(e) => showMenu(e, row._id)}
      />
      <Menu
        popup
        model={[
          {
            label: 'Voir Produits',
            icon: 'pi pi-eye',
            command: () => handleOpenModal(row),
          },
        ]}
        ref={(el) => setMenuRefs((prev) => ({ ...prev, [row._id]: el }))}
      />
    </>
  );

  const regionTemplate = (row: Commande) => row.region?.nom || '-';
  const pvTemplate = (row: Commande) => row.pointVente?.nom || '-';
  const statutTemplate = (row: Commande) => (
    <span
      className={`px-2 py-1 rounded text-white text-sm ${
        row.statut === 'livrée'
          ? 'bg-green-500'
          : row.statut === 'annulée'
            ? 'bg-red-400'
            : 'bg-yellow-400'
      }`}
    >
      {row.statut}
    </span>
  );

  const montantTemplate = (row: Commande) =>
    new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF' }).format(
      row?.montant ?? 0
    );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mt-5 mb-5">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Commandes' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-500">Gestion des Commandes</h2>
      </div>

      <div className="gap-4 mb-4 w-full  bg-white flex justify-between p-2 rounded-lg shadow-md">
        <DataTable
          value={commandes}
          paginator
          rows={10}
          loading={loading}
          responsiveLayout="scroll"
          className="shadow-md rounded-lg w-full"
        >
          <Column field="numero" header="Numéro" />
          <Column body={regionTemplate} header="Région" />
          <Column body={pvTemplate} header="Point de vente" />
          <Column field="nombreCommandeProduit" header="Nb Produits" />
          <Column body={statutTemplate} header="Statut" />
          <Column body={montantTemplate} header="Montant" />
          <Column body={actionTemplate} header="Action" />
        </DataTable>
      </div>

      {/* MODAL */}
      <Dialog
        header="Détails de la commande"
        visible={visible}
        onHide={() => setVisible(false)}
        style={{ width: '95vw', maxWidth: '800px' }}
        modal
      >
        <DataTable
          value={produitsLivrables}
          responsiveLayout="scroll"
          rowClassName={(row) => (row.statut === 'livré' ? 'bg-green-50' : '')}
        >
          <Column field="produit.nom" header="Produit" />
          <Column field="quantite" header="Quantité" />
          <Column
            header="Livré"
            body={(row, options) => (
              <Checkbox
                checked={row._tempChecked}
                disabled={row.statut === 'livré'}
                onChange={(e) => handleCheck(e.checked!, options.rowIndex)}
              />
            )}
          />
        </DataTable>

        <div className="flex justify-end mt-4">
          <Button
            label="Effectuer la livraison"
            icon="pi pi-check"
            onClick={effectuerLivraison}
            loading={saving}
            disabled={saving}
            className="p-button-success"
          />
        </div>
      </Dialog>
    </div>
  );
};

export default Page;
