'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Skeleton } from 'primereact/skeleton';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';

import type { AppDispatch, RootState } from '@/stores/store';
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

import {
  fetchStocks,
  fetchStockByPointVenteId,
  fetchStockByRegionId,
  selectAllStocks,
} from '@/stores/slices/stock/stockSlice';

import type { Commande } from '@/Models/commandeType';
import type { CommandeProduit } from '@/Models/CommandeProduitType';
import type { Stock } from '@/Models/stock';

import { format } from 'date-fns';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';

/* ----------------------------- Utils ----------------------------- */
type Period = 'tout' | 'jour' | 'semaine' | 'mois' | 'annee';
const MONTHS_SHORT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];
const PERIOD_LABELS: Record<Period, string> = {
  tout: 'Tout',
  jour: 'Jour',
  semaine: 'Semaine',
  mois: 'Mois',
  annee: 'Année',
};
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function inDateRange(d?: string | Date, from?: string, to?: string) {
  if (!d) return false;
  const t = new Date(d).getTime();
  const f = from ? new Date(from).getTime() : undefined;
  const tt = to ? new Date(to).getTime() : undefined;
  if (f != null && t < f) return false;
  if (tt != null && t > tt) return false;
  return true;
}

/* ============================== Composant ============================== */
const GerantDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Rôles
  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

  // Stores
  const commandes = useSelector((s: RootState) => asArray<Commande>(selectAllCommandes(s)));
  const loading = useSelector((s: RootState) => selectCommandeStatus(s)) === 'loading';

  const stocks = useSelector((s: RootState) => asArray<Stock>(selectAllStocks(s)));

  // Filtre temps
  const [period, setPeriod] = useState<Period>('mois');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth());

  const buildRange = useCallback(() => {
    const now = new Date();
    if (period === 'tout') return { dateFrom: undefined, dateTo: undefined };

    if (period === 'jour')
      return { dateFrom: startOfDay(now).toISOString(), dateTo: endOfDay(now).toISOString() };

    if (period === 'semaine') {
      const df = startOfWeek(now, { weekStartsOn: 1 });
      const dt = endOfWeek(now, { weekStartsOn: 1 });
      return { dateFrom: df.toISOString(), dateTo: dt.toISOString() };
    }

    if (period === 'mois') {
      const df = startOfMonth(new Date(year, month, 1));
      const dt = endOfMonth(new Date(year, month, 1));
      return { dateFrom: df.toISOString(), dateTo: dt.toISOString() };
    }

    if (period === 'annee') {
      const df = startOfYear(new Date(year, 0, 1));
      const dt = endOfYear(new Date(year, 0, 1));
      return { dateFrom: df.toISOString(), dateTo: dt.toISOString() };
    }

    return { dateFrom: undefined, dateTo: undefined };
  }, [period, month, year]);

  const selectedPeriodText = useMemo(() => {
    const now = new Date();
    if (period === 'jour') return format(now, 'dd/MM/yyyy');
    if (period === 'semaine') {
      const from = startOfWeek(now, { weekStartsOn: 1 });
      const to = endOfWeek(now, { weekStartsOn: 1 });
      return `${format(from, 'dd/MM')} – ${format(to, 'dd/MM/yyyy')}`;
    }
    if (period === 'mois') return `${MONTHS_SHORT[month]} ${year}`;
    if (period === 'annee') return String(year);
    return 'Toutes périodes';
  }, [period, month, year]);

  // Chargement des données (commandes + stocks selon rôle)
  useEffect(() => {
    if (!user?.role) return;

    // Commandes
    if (isSuperAdmin) {
      // @ts-expect-error types lib
      dispatch(fetchCommandes());
    } else if (isAdminPointVente && user?.pointVente?._id) {
      dispatch(fetchCommandesByPointVente(user.pointVente._id));
    } else if (isAdminRegion && user?.region?._id) {
      dispatch(fetchCommandesByRegion(user.region._id));
    } else if (user.role === 'Logisticien' && user?._id) {
      dispatch(fetchCommandesByUser(user._id));
    }

    // Stocks (pour KPI "stock en rupture")
    if (isAdminPointVente && user?.pointVente?._id) {
      dispatch(fetchStockByPointVenteId(user.pointVente._id));
    } else if (isAdminRegion && user?.region?._id) {
      dispatch(fetchStockByRegionId(user.region._id));
    } else {
      dispatch(fetchStocks({}));
    }
  }, [
    dispatch,
    user?.role,
    user?.pointVente?._id,
    user?.region?._id,
    isSuperAdmin,
    isAdminPointVente,
    isAdminRegion,
  ]);

  // Appliquer le filtre de période localement (au cas où la route ne le supporte pas)
  const { dateFrom, dateTo } = buildRange();
  const commandesFiltrees = useMemo(
    () =>
      commandes.filter((c) => {
        // on se base sur createdAt ou updatedAt si nécessaire
        const d = (c as any)?.createdAt ?? (c as any)?.updatedAt;
        return inDateRange(d, dateFrom, dateTo);
      }),
    [commandes, dateFrom, dateTo]
  );

  // KPIs (dépendent du filtre)
  // 1) Commandes non livrées (montant total) sur la période
  const totalMontantNonLivrees = useMemo(() => {
    return commandesFiltrees
      .filter((c) => c.statut !== 'livrée') // "statut non valide"
      .reduce((acc, c) => acc + (Number((c as any)?.montant) || 0), 0);
  }, [commandesFiltrees]);

  // 2) Produits commandés (compte) sur la période
  const nbProduitsCommandes = useMemo(() => {
    return commandesFiltrees.reduce((acc, c) => {
      const produits = (c as any)?.produits ?? [];
      return acc + (Array.isArray(produits) ? produits.length : 0);
    }, 0);
  }, [commandesFiltrees]);

  // 3) Stock en rupture (quantite < seuil) — dépend des stocks du rôle courant
  const stockEnRupture = useMemo(() => {
    return stocks.filter((s) => {
      const seuil = Number((s as any)?.produit?.seuil) || 0;
      const qte = Number((s as any)?.quantite) || 0;
      return qte < seuil;
    }).length;
  }, [stocks]);

  // ---------- DataTable / Actions commande ----------
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [visible, setVisible] = useState(false);
  type CommandeProduitWithTempChecked = CommandeProduit & { _tempChecked?: boolean };
  const [produitsLivrables, setProduitsLivrables] = useState<CommandeProduitWithTempChecked[]>([]);
  const [menuRefs, setMenuRefs] = useState<{ [key: string]: Menu | null }>({});
  const [saving, setSaving] = useState(false);

  const showMenu = (event: React.MouseEvent, commandeId: string) => {
    if (menuRefs[commandeId]) menuRefs[commandeId]?.toggle(event);
  };

  const handleOpenModal = (commande: Commande) => {
    setSelectedCommande(commande);
    setProduitsLivrables(
      (commande.produits || []).map((p) => ({
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

      const updatedCommande = { ...selectedCommande, produits: updatedProduits };

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
        model={[{ label: 'Voir Produits', icon: 'pi pi-eye', command: () => handleOpenModal(row) }]}
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
    new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
    }).format((row as any)?.montant ?? 0);

  // UI helpers
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');

  return (
    <div className="w-full">
      <Toast ref={toast} />

      {/* Header */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Tableau de bord' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-5000">du {formattedDate}</h2>
      </div>

      {/* Filtre temporel (design moderne + résumé) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-md mb-5 bg-gradient-to-br from-green-50 to-white">
        <div className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-green-50 to-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-800 ring-1 ring-inset ring-green-200">
            <i className="pi pi-calendar-clock text-base" aria-hidden="true" />
            Filtre
          </span>

          {/* Sélecteur période */}
          <div className="relative w-40">
            <select
              className="appearance-none border border-gray-300 rounded-md px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ease-in-out pr-10 cursor-pointer"
              value={period}
              onChange={(e) => {
                const p = e.target.value as Period;
                setPeriod(p);
                if (p === 'mois') {
                  if (month < 0 || month > 11) setMonth(new Date().getMonth());
                  if (year < 2000 || year > 2100) setYear(new Date().getFullYear());
                }
                if (p === 'annee') {
                  if (year < 2000 || year > 2100) setYear(new Date().getFullYear());
                }
              }}
              aria-label="Sélecteur période"
            >
              <option value="tout">Tout</option>
              <option value="jour">Jour</option>
              <option value="semaine">Semaine</option>
              <option value="mois">Mois</option>
              <option value="annee">Année</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="pi pi-chevron-down text-sm" aria-hidden="true" />
            </span>
          </div>

          {/* Sélecteur mois + année quand period = mois */}
          {period === 'mois' && (
            <>
              <div className="relative w-28">
                <select
                  className="appearance-none border border-gray-300 rounded-md px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ease-in-out pr-10 cursor-pointer"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  aria-label="Sélecteur mois"
                >
                  {MONTHS_SHORT.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="pi pi-chevron-down text-sm" aria-hidden="true" />
                </span>
              </div>

              <input
                type="number"
                className="border border-gray-300 rounded-md px-4 py-2 text-sm w-28 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ease-in-out"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="Année"
                min={2000}
                max={2100}
                aria-label="Sélecteur année"
              />
            </>
          )}

          {/* Sélecteur année quand period = annee */}
          {period === 'annee' && (
            <input
              type="number"
              className="border border-gray-300 rounded-md px-4 py-2 text-sm w-28 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ease-in-out"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              placeholder="Année"
              min={2000}
              max={2100}
              aria-label="Sélecteur année"
            />
          )}
        </div>

        {/* Résumé sélection */}
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-gray-500">Sélection :</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
            <i className="pi pi-clock text-xs text-gray-500" />
            <span className="whitespace-nowrap">
              {PERIOD_LABELS[period]} • {selectedPeriodText}
            </span>
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex flex-row gap-5 mb-6">
        {/* Commandes non livrées (CDF) */}
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
                        Commandes non livrées (CDF)
                      </h3>
                      <span className="text-green-600 text-xs font-medium px-2 py-1 rounded-full">
                        •
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-green-900">
                        {formatCurrency(totalMontantNonLivrees)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-euro text-white text-xl" />
                  </div>
                </div>
              </div>
            )}
            <div className="h-1 w-full bg-green-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>

        {/* Stock en rupture */}
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
                        •
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-red-900">
                        {stockEnRupture.toLocaleString('fr-FR')} produits
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

        {/* Produits commandés */}
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
                        Produits commandés
                      </h3>
                      <span className="text-orange-600 text-xs font-medium px-2 py-1 rounded-full">
                        •
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-orange-900">
                        {nbProduitsCommandes.toLocaleString('fr-FR')}
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

      {/* Table Commandes — filtrée par période */}
      <div className="gap-4 mb-4 w-full bg-white p-2 rounded-lg shadow-md">
        <DataTable
          value={commandesFiltrees}
          paginator
          rows={10}
          loading={loading}
          responsiveLayout="scroll"
          className="shadow-md rounded-lg w-full"
          emptyMessage="Aucune commande sur la période sélectionnée"
          rowHover
        >
          <Column header="#" body={(_, opt) => (opt?.rowIndex ?? 0) + 1} />
          <Column field="numero" header="Numéro" />
          <Column body={regionTemplate} header="Région" />
          <Column body={pvTemplate} header="Point de vente" />
          <Column field="nombreCommandeProduit" header="Nb Produits" />
          <Column body={statutTemplate} header="Statut" />
          <Column body={montantTemplate} header="Montant" />
          <Column body={actionTemplate} header="Action" />
        </DataTable>
      </div>

      {/* MODAL Détails commande */}
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
          emptyMessage="Aucun produit"
        >
          <Column field="produit.nom" header="Produit" />
          <Column field="quantite" header="Quantité" />
          <Column
            header="Livré"
            body={(row, options) => (
              <Checkbox
                checked={row._tempChecked}
                disabled={row.statut === 'livré'}
                onChange={(e) => handleCheck(!!e.checked, options.rowIndex)}
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
