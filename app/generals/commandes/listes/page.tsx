'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import type { Toast as ToastRef } from 'primereact/toast';
import { Menu } from 'primereact/menu';
import type { Menu as MenuRef } from 'primereact/menu';

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

/* ----------------------------- Helpers ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const formatCDF = (n: unknown) =>
  new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF' }).format(safeNumber(n, 0));

type CommandeProduitWithTempChecked = CommandeProduit & { _tempChecked?: boolean };
type MenuMap = Record<string, MenuRef | null>;

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<ToastRef>(null);

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

  const commandes = useSelector((s: RootState) => asArray<Commande>(selectAllCommandes(s)));
  const loading = useSelector((s: RootState) => selectCommandeStatus(s)) === 'loading';

  // UI state
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [visible, setVisible] = useState(false);
  const [produitsLivrables, setProduitsLivrables] = useState<CommandeProduitWithTempChecked[]>([]);
  const [saving, setSaving] = useState(false);

  // menus (références)
  const menuRefs = useRef<MenuMap>({});

  /* ------------------------- Data load (rôle) ------------------------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user?.role) return;

        if (isSuperAdmin) {
          //@ts-ignore
          await dispatch(fetchCommandes());
        } else if (isAdminPointVente && isNonEmptyString((user as any)?.pointVente?._id)) {
          await dispatch(fetchCommandesByPointVente((user as any).pointVente._id));
        } else if (isAdminRegion && isNonEmptyString((user as any)?.region?._id)) {
          await dispatch(fetchCommandesByRegion((user as any).region._id));
        } else if (user?.role === 'Logisticien' && isNonEmptyString(user?._id)) {
          // ✅ bon paramètre: id utilisateur (pas le pv)
          await dispatch(fetchCommandesByUser(user._id));
        } else {
          //@ts-ignore
          await dispatch(fetchCommandes());
        }
      } catch {
        if (!active) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les commandes.',
          life: 3000,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch, user?.role, (user as any)?.pointVente?._id, (user as any)?.region?._id, user?._id, isSuperAdmin, isAdminPointVente, isAdminRegion]);

  /* ------------------------------ Menu actions ------------------------------ */
  const setMenuRef = useCallback((id: string, el: MenuRef | null) => {
    if (!id) return;
    menuRefs.current[id] = el;
  }, []);

  const showMenu = useCallback((event: React.MouseEvent, id: string) => {
    menuRefs.current[id]?.toggle(event);
  }, []);

  /* -------------------------- Modal / Produits livrés ----------------------- */
  const handleOpenModal = useCallback((commande: Commande) => {
    setSelectedCommande(commande);
    const produits = asArray<CommandeProduit>(commande?.produits);
    setProduitsLivrables(produits.map((p) => ({ ...p, _tempChecked: p?.statut === 'livré' })));
    setVisible(true);
  }, []);

  const handleCheck = useCallback((checked: boolean, index: number) => {
    setProduitsLivrables((prev) => prev.map((p, i) => (i === index ? { ...p, _tempChecked: !!checked } : p)));
  }, []);

  const effectuerLivraison = useCallback(async () => {
    if (!selectedCommande) return;
    setSaving(true);
    try {
      const updatedProduits = asArray<CommandeProduit>(produitsLivrables).map((p) => ({
        ...p,
        // @ts-ignore champ temporaire
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
        life: 2500,
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

  /* ------------------------------ Templates UI ------------------------------ */
  const regionTemplate = useCallback((row: Commande) => row?.region?.nom ?? '-', []);
  const pvTemplate = useCallback((row: Commande) => row?.pointVente?.nom ?? '-', []);
  const nbProduitsTemplate = useCallback((row: Commande) => asArray<CommandeProduit>(row?.produits).length, []);
  const montantTemplate = useCallback((row: Commande) => formatCDF((row as any)?.montant), []);
  const statutTemplate = useCallback((row: Commande) => {
    const s = row?.statut ?? '-';
    const cls = s === 'livrée' ? 'bg-green-600' : s === 'annulée' ? 'bg-red-500' : 'bg-amber-500';
    return <span className={`px-2 py-1 rounded text-white text-xs ${cls}`}>{s}</span>;
  }, []);

  const actionTemplate = useCallback(
    (row: Commande) => (
      <>
        <Button
          icon="pi pi-bars"
          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
          onClick={(e) => showMenu(e, row?._id ?? '')}
          disabled={!isNonEmptyString(row?._id)}
          aria-haspopup
        />
        <Menu
          popup
          model={[
            { label: 'Voir produits', icon: 'pi pi-eye', command: () => handleOpenModal(row) },
          ]}
          ref={(el) => setMenuRef(row?._id ?? '', el)}
        />
      </>
    ),
    [handleOpenModal, setMenuRef, showMenu]
  );

  const onPage = useCallback((e: any) => {
    setFirst(e.first ?? 0);
    setRows(e.rows ?? 10);
  }, []);

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between mt-5 mb-5">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Commandes' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Commandes</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <DataTable
          value={commandes}
          paginator
          rows={rows}
          first={first}
          onPage={onPage}
          loading={loading}
          size="small"
          className="rounded-lg text-sm"
          tableStyle={{ minWidth: '70rem' }}
          emptyMessage="Aucune commande trouvée."
          // zébrage identique aux autres pages
          //@ts-ignore PrimeReact passe (data, options)
          rowClassName={(_, opt) => (opt?.rowIndex % 2 === 0 ? '!bg-gray-100 !text-gray-900' : '!bg-green-50 !text-gray-900')}
        >
          <Column
            header="#"
            body={(_, opt) => <span className="text-sm">{first + (opt?.rowIndex ?? 0) + 1}</span>}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            field="numero"
            header="Numéro"
            body={(r: Commande) => r?.numero ?? '-'}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Région"
            body={regionTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Point de vente"
            body={pvTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Nb produits"
            body={nbProduitsTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Statut"
            body={statutTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Montant"
            body={montantTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Actions"
            body={actionTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
        </DataTable>
      </div>

      {/* MODAL */}
      <Dialog
        header="Détails de la commande"
        visible={visible}
        onHide={() => setVisible(false)}
        style={{ width: '95vw', maxWidth: 880 }}
        modal
      >
        <DataTable
          value={asArray<CommandeProduitWithTempChecked>(produitsLivrables)}
          responsiveLayout="scroll"
          emptyMessage="Aucun produit."
          size="small"
          className="rounded-lg text-sm"
          //@ts-ignore
          rowClassName={(row) => (row?.statut === 'livré' ? '!bg-green-50' : '')}
        >
          <Column
            header="#"
            body={(_, opt) => <span className="text-sm">{(opt?.rowIndex ?? 0) + 1}</span>}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Produit"
            body={(row: CommandeProduitWithTempChecked) => row?.produit?.nom ?? '-'}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Quantité"
            body={(row: CommandeProduitWithTempChecked) => safeNumber(row?.quantite).toString()}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Livré"
            body={(row: CommandeProduitWithTempChecked, options) => (
              <Checkbox
                checked={!!row?._tempChecked}
                disabled={row?.statut === 'livré'}
                onChange={(e) =>
                  Number.isInteger(options?.rowIndex) && handleCheck(!!e.checked, options.rowIndex as number)
                }
              />
            )}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
        </DataTable>

        <div className="flex justify-end mt-4 gap-2">
          <Button label="Fermer" icon="pi pi-times" className="p-button-text" onClick={() => setVisible(false)} />
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
