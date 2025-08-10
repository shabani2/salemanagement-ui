'use client';

import React, { useCallback, useEffect,  useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';

import { AppDispatch, RootState } from '@/stores/store';
import { useUserRole } from '@/hooks/useUserRole';

import {
  fetchCommandes,
  fetchCommandesByPointVente,
  fetchCommandesByRegion,
  fetchCommandesByUser,
  selectAllCommandes,
  selectCommandeStatus,
  updateCommande,
} from '@/stores/slices/commandes/commandeSlice';

import type { Commande } from '@/Models/commandeType';
import type { CommandeProduit } from '@/Models/CommandeProduitType';

/* ----------------------------- Helpers robustes ---------------------------- */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const formatCDF = (n: unknown) =>
  new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF' }).format(
    safeNumber(n, 0)
  );

/* PrimeReact Menu via ref */
type MenuMap = Record<string, Menu | null>;
type CommandeProduitWithTempChecked = CommandeProduit & { _tempChecked?: boolean };

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

  const commandes = useSelector((state: RootState) => asArray<Commande>(selectAllCommandes(state)));
  const loading = useSelector((state: RootState) => selectCommandeStatus(state)) === 'loading';

  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [visible, setVisible] = useState(false);
  const [produitsLivrables, setProduitsLivrables] = useState<CommandeProduitWithTempChecked[]>([]);
  const [saving, setSaving] = useState(false);

  // map de menus par id, stocké dans un ref pour éviter les re-renders
  const menuRefs = useRef<MenuMap>({});

  /* ----------------------------- Chargement data ---------------------------- */
  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        if (!user?.role) return;
        if (isSuperAdmin) {
          await dispatch(fetchCommandes());
        } else if (isAdminPointVente && isNonEmptyString(user?.pointVente?._id)) {
          await dispatch(fetchCommandesByPointVente(user!.pointVente!._id!));
        } else if (isAdminRegion && isNonEmptyString(user?.region?._id)) {
          await dispatch(fetchCommandesByRegion(user!.region!._id!));
        } else if (user?.role === 'Logisticien' && isNonEmptyString(user?.pointVente?._id)) {
          await dispatch(fetchCommandesByUser(user!.pointVente!._id!));
        } else {
          // fallback: tenter toutes les commandes
          await dispatch(fetchCommandes());
        }
      } catch (e) {
        if (!isActive) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: `Impossible de charger les commandes. : ${e}`,
          life: 3000,
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [dispatch, user?.role, user?.pointVente?._id, user?.region?._id, isSuperAdmin, isAdminPointVente, isAdminRegion]);

  /* ------------------------------ Menus actions ----------------------------- */
  const setMenuRef = useCallback((id: string, el: Menu | null) => {
    menuRefs.current[id] = el;
  }, []);

  const showMenu = useCallback((event: React.MouseEvent, commandeId: string) => {
    const m = menuRefs.current[commandeId];
    m?.toggle(event);
  }, []);

  /* ----------------------------- Modal / produits --------------------------- */
  const handleOpenModal = useCallback((commande: Commande) => {
    setSelectedCommande(commande ?? null);
    const produits = asArray<CommandeProduit>(commande?.produits);
    const prepared = produits.map((p) => ({
      ...p,
      _tempChecked: p?.statut === 'livré',
    }));
    setProduitsLivrables(prepared);
    setVisible(true);
  }, []);

  const handleCheck = useCallback((checked: boolean, index: number) => {
    setProduitsLivrables((prev) =>
      prev.map((p, i) => (i === index ? { ...p, _tempChecked: !!checked } : p))
    );
  }, []);

  const effectuerLivraison = useCallback(async () => {
    if (!selectedCommande) return;
    setSaving(true);
    try {
      const updatedProduits: CommandeProduit[] = asArray<CommandeProduit>(produitsLivrables).map((p) => ({
        ...p,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        statut: p._tempChecked ? 'livré' : p.statut,
      }));

      const payload: Commande = {
        ...selectedCommande,
        produits: updatedProduits,
      };

      await dispatch(updateCommande(payload)).unwrap();

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
  }, [dispatch, selectedCommande, produitsLivrables]);

  /* --------------------------------- Templates ------------------------------ */
  const actionTemplate = useCallback(
    (row: Commande) => (
      <>
        <Button
          icon="pi pi-ellipsis-v"
          className="p-button-text"
          onClick={(e) => showMenu(e, row?._id ?? '')}
          disabled={!isNonEmptyString(row?._id)}
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
          ref={(el) => setMenuRef(row?._id ?? '', el)}
        />
      </>
    ),
    [handleOpenModal, setMenuRef, showMenu]
  );

  const regionTemplate = useCallback((row: Commande) => row?.region?.nom ?? '-', []);
  const pvTemplate = useCallback((row: Commande) => row?.pointVente?.nom ?? '-', []);
  const statutTemplate = useCallback((row: Commande) => {
    const s = row?.statut ?? '-';
    const cls =
      s === 'livrée' ? 'bg-green-500' : s === 'annulée' ? 'bg-red-400' : 'bg-yellow-400';
    return (
      <span className={`px-2 py-1 rounded text-white text-sm ${cls}`}>
        {s}
      </span>
    );
  }, []);
  const nbProduitsTemplate = useCallback(
    (row: Commande) => asArray<CommandeProduit>(row?.produits).length,
    []
  );
  const montantTemplate = useCallback((row: Commande) => formatCDF(row?.montant), []);

  /* ---------------------------------- UI ----------------------------------- */
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

      <div className="gap-4 mb-4 w-full bg-white flex justify-between p-2 rounded-lg shadow-md">
        <DataTable
          value={asArray<Commande>(commandes)}
          paginator
          rows={10}
          loading={loading}
          responsiveLayout="scroll"
          className="shadow-md rounded-lg w-full"
          emptyMessage="Aucune commande trouvée"
          rowClassName={(_, i) =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            i?.rowIndex % 2 === 0 ? '!bg-gray-50' : ''
          }
        >
          <Column field="numero" header="Numéro" body={(r: Commande) => r?.numero ?? '-'} />
          <Column header="Région" body={regionTemplate} />
          <Column header="Point de vente" body={pvTemplate} />
          <Column header="Nb Produits" body={nbProduitsTemplate} />
          <Column header="Statut" body={statutTemplate} />
          <Column header="Montant" body={montantTemplate} />
          <Column header="Action" body={actionTemplate} />
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
          value={asArray<CommandeProduitWithTempChecked>(produitsLivrables)}
          responsiveLayout="scroll"
          emptyMessage="Aucun produit"
          rowClassName={(row) => (row?.statut === 'livré' ? 'bg-green-50' : '')}
        >
          {/* DataTable ne résout pas automatiquement "produit.nom" → body dédié */}
          <Column
            header="Produit"
            body={(row: CommandeProduitWithTempChecked) => row?.produit?.nom ?? '-'}
          />
          <Column
            header="Quantité"
            body={(row: CommandeProduitWithTempChecked) => safeNumber(row?.quantite).toString()}
          />
          <Column
            header="Livré"
            body={(row: CommandeProduitWithTempChecked, options) => (
              <Checkbox
                checked={!!row?._tempChecked}
                disabled={row?.statut === 'livré'}
                onChange={(e) =>
                  Number.isInteger(options?.rowIndex) &&
                  handleCheck(!!e.checked, options.rowIndex as number)
                }
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
