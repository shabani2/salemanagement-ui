'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Skeleton } from 'primereact/skeleton';
import { AppDispatch, RootState } from '@/stores/store';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import {
  fetchCommandes,
  fetchCommandesByPointVente,
  fetchCommandesByRegion,
  fetchCommandesByUser,
  selectAllCommandes,
  selectCommandeStatus,
  updateCommande,
} from '@/stores/slices/commandes/commandeSlice';
import { Toast } from 'primereact/toast';
import { Commande } from '@/Models/commandeType';
import { Checkbox } from 'primereact/checkbox';
import { useUserRole } from '@/hooks/useUserRole';
import { CommandeProduit } from '@/Models/CommandeProduitType';
import { format } from 'date-fns';

const GerantDashboard = () => {
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
  const now = new Date();
  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');
  useEffect(() => {
    if (!user?.role) return;
    if (isSuperAdmin) {
      // @ts-expect-error - compat: external lib types mismatch
      dispatch(fetchCommandes());
    } else if (isAdminPointVente) {
      dispatch(fetchCommandesByPointVente(user?.pointVente._id));
    } else if (isAdminRegion) {
      dispatch(fetchCommandesByRegion(user?.region._id));
    } else if (user.role === 'Logisticien') {
      dispatch(fetchCommandesByUser(user?.pointVente?._id));
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - typage imprécis de la lib externe
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
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Tableau de bord' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-5000">du {formattedDate}</h2>
      </div>
      {/* Section Cartes - Design responsive amélioré */}
      <div className="flex flex-row gap-5  mb-6">
        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                        Commandes(Fc)
                      </h3>
                      {/* Vous pouvez ajouter une tendance ici si nécessaire */}
                      <span className="text-green-600 text-xs font-medium px-2 py-1 rounded-full">
                        ↗ 2.5%
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xl font-bold text-green-900">{0}</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-euro text-white text-xl" />
                  </div>
                </div>
              </div>
            )}

            {/* Barre de progression subtile */}
            <div className="h-1 w-full bg-green-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>

        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-red-50 to-white rounded-xl shadow-lg overflow-hidden border border-red-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                        Stock en rupture
                      </h3>
                      <span className="text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                        ↗ 8.2%
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xl font-bold text-red-900">
                        {(0).toLocaleString('fr-FR')} unités
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-box text-white text-xl" />
                  </div>
                </div>
              </div>
            )}

            <div className="h-1 w-full bg-red-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>

        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-lg overflow-hidden border border-orange-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                        Produits Commandés
                      </h3>

                      {/* Exemple de tendance rouge */}
                      <span className="text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                        ↗ 8.2%
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xl font-bold text-orange-900">
                        {(commandes.length || 0).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-shopping-cart text-white text-xl" />
                  </div>
                </div>
              </div>
            )}

            <div className="h-1 w-full bg-orange-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DataTable - Pleine largeur avec design optimisé */}
      <div className="gap-4 mb-4 w-full  bg-white flex justify-between p-2 rounded-lg shadow-md">
        <DataTable
          value={commandes ?? []}
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

export default GerantDashboard;
