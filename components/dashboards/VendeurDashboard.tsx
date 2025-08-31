/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';

import type { AppDispatch, RootState } from '@/stores/store';
import {
  fetchMouvementsStock,
  selectAllMouvementsStock,
  selectMouvementStockStatus,
} from '@/stores/slices/mvtStock/mvtStock';

import type { MouvementStock } from '@/Models/mouvementStockType';

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

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const PERIOD_LABELS: Record<Period, string> = {
  tout: 'Tout',
  jour: 'Jour',
  semaine: 'Semaine',
  mois: 'Mois',
  annee: 'Année',
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/* ======================================================================= */
/*                             VendeurDashboard                             */
/* ======================================================================= */

const VendeurDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // --- user depuis localStorage
  const user = useMemo(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('user-agricap');
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  }, []);
  const userId: string | undefined = user?._id;

  // --- store
  const mouvements = useSelector((s: RootState) => asArray<MouvementStock>(selectAllMouvementsStock(s)));
  const mvtStatus = useSelector(selectMouvementStockStatus);
  const loading = mvtStatus === 'loading';

  // --- filtre de temps
  const [period, setPeriod] = useState<Period>('mois');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()); // 0..11

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

  // --- chargement
  const loadMouvements = useCallback(() => {
    if (!userId) return;
    const { dateFrom, dateTo } = buildRange();

    dispatch(
      fetchMouvementsStock({
        page: 1,
        limit: 1000,
        includeRefs: true,
        includeTotal: true,
        sortBy: 'createdAt',
        order: 'desc',
        user: userId,          // ✅ filtre par vendeur
        dateFrom,              // ✅ filtre temps
        dateTo,
      })
    );
  }, [dispatch, userId, buildRange]);

  useEffect(() => {
    loadMouvements();
  }, [loadMouvements]);

  // reset pagination table si filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [period, month, year, userId]);

  /* --------------------------- Agrégations UI --------------------------- */

  // KPI: CA = somme des montants des Ventes sur la période pour ce user
  const totalVentes = useMemo(
    () => mouvements.filter((m) => m?.type === 'Vente').reduce((acc, m) => acc + (Number(m?.montant) || 0), 0),
    [mouvements]
  );

  // Agrégation par produit (quantité, montant, occurrences)
  type AggRow = {
    key: string;
    produit?: any;
    totalQuantite: number;
    totalMontant: number;
    count: number;
  };

  const aggregated: AggRow[] = useMemo(() => {
    const map = new Map<string, AggRow>();
    mouvements.forEach((m) => {
      if (!m?.produit) return;
      const produitId = (m as any)?.produit?._id || (m as any)?.produit;
      const key = String(produitId || 'NA');
      const q = Number(m?.quantite) || 0;
      const mt = Number(m?.montant) || 0;

      const prev = map.get(key);
      if (prev) {
        prev.totalQuantite += q;
        prev.totalMontant += mt;
        prev.count += 1;
      } else {
        map.set(key, {
          key,
          produit: (m as any)?.produit,
          totalQuantite: q,
          totalMontant: mt,
          count: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [mouvements]);

  // Produits le plus / le moins vendus (par quantité)
  const mostSold = useMemo(() => {
    if (aggregated.length === 0) return null;
    return aggregated.reduce((max, curr) => (curr.totalQuantite > max.totalQuantite ? curr : max));
  }, [aggregated]);

  const leastSold = useMemo(() => {
    if (aggregated.length === 0) return null;
    return aggregated.reduce((min, curr) => (curr.totalQuantite < min.totalQuantite ? curr : min));
  }, [aggregated]);

  /* ------------------------- Table + pagination ------------------------- */
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalRecords = aggregated.length;
  const first = (currentPage - 1) * rowsPerPage;
  const pageRows = useMemo(() => aggregated.slice(first, first + rowsPerPage), [aggregated, first]);

  /* ------------------------------ Helpers UI ------------------------------ */
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(value || 0);

  const produitBodyTemplate = (row: AggRow) => row?.produit?.nom || 'Produit inconnu';
  const quantiteBodyTemplate = (row: AggRow) => (
    <Tag value={row.totalQuantite.toLocaleString('fr-FR')} severity="info" className="font-bold" />
  );
  const montantBodyTemplate = (row: AggRow) => formatCurrency(row.totalMontant);

  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');

  /* ---------------------------------- UI ---------------------------------- */
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

      {/* Filtre temporel (design moderne + résumé) */}
      <div className="flex flex-wrap items-center gap-3 justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm mb-5 bg-gradient-to-br from-green-50 to-white">
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-md border border-gray-200 bg-gradient-to-br from-green-50 to-white">
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

  {/* Sélecteur mois + année lorsque period = mois */}
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

  {/* Sélecteur année lorsque period = annee */}
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

      {/* Section KPIs */}
      <div className="flex flex-row gap-5 mb-6">
        {/* Total Ventes */}
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
                        Chiffre d&apos;affaires
                      </h3>
                      <span className="text-green-600 text-xs font-medium px-2 py-1 rounded-full">•</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-green-900">
                        {formatCurrency(totalVentes)}
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
              <div className="h-full bg-gradient-to-r from-green-400 to-green-500" style={{ width: '30%' }} />
            </div>
          </div>
        </div>

        {/* Produit le plus vendu */}
        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : mostSold ? (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                        Produit le plus vendu
                      </h3>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-bold text-green-900">{mostSold.produit?.nom || 'N/A'}</div>
                      <div className="text-green-700 text-sm mt-1">
                        {mostSold.totalQuantite.toLocaleString('fr-FR')} unités
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-arrow-up text-white text-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-gray-500">
                <i className="pi pi-info-circle mr-2" />
                Aucun produit vendu
              </div>
            )}
            <div className="h-1 w-full bg-green-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-green-500" style={{ width: '45%' }} />
            </div>
          </div>
        </div>

        {/* Produit le moins vendu */}
        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-lg overflow-hidden border border-orange-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : leastSold ? (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                        Produit le moins vendu
                      </h3>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-bold text-orange-900">{leastSold.produit?.nom || 'N/A'}</div>
                      <div className="text-orange-700 text-sm mt-1">
                        {leastSold.totalQuantite.toLocaleString('fr-FR')} unités
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-arrow-down text-white text-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-gray-500">
                <i className="pi pi-info-circle mr-2" />
                Aucun produit vendu
              </div>
            )}
            <div className="h-1 w-full bg-orange-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: '15%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table agrégée par produit (période sélectionnée + user) */}
      <div className="col-12 mt-5">
        <Card
          title={`Produits (${totalRecords})`}
          className="shadow-2 border-round-lg p-3"
          subTitle="Statistiques de vente par produit (sur la période sélectionnée)"
        >
          <DataTable
            value={pageRows}
            paginator
            rows={rowsPerPage}
            totalRecords={totalRecords}
            first={first}
            onPage={(e) => setCurrentPage(e.first / rowsPerPage + 1)}
            loading={loading}
            emptyMessage="Aucun produit trouvé sur la période"
            stripedRows
            scrollable
            className="mt-3"
            rowHover
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1 + first}
              className="px-4 py-1 text-[11px]"
            />

            {/* Avatar catégorie si dispo dans row.produit.categorie.image */}
            <Column
              header=""
              body={(row: AggRow) => {
                const cat = row?.produit?.categorie;
                const img = typeof cat === 'object' ? cat?.image : '';
                const url = img ? `http://localhost:8000/${String(img).replace('../', '')}` : '';
                return url ? (
                  <div className="w-10 h-10">
                    <img
                      src={url}
                      alt={row?.produit?.nom || ''}
                      className="rounded-full w-full h-full object-cover border border-gray-100"
                      onError={(e) => ((e.currentTarget.style.display = 'none'))}
                    />
                  </div>
                ) : (
                  <span className="text-[11px]">—</span>
                );
              }}
              className="px-4 py-1 text-[11px]"
            />

            <Column field="produit.nom" header="Produit" body={produitBodyTemplate} sortable />
            <Column field="totalQuantite" header="Quantité vendue" body={quantiteBodyTemplate} align="center" sortable />
            <Column field="totalMontant" header="Montant total" body={montantBodyTemplate} align="right" sortable />
            <Column field="count" header="Transactions" align="center" sortable />
          </DataTable>
        </Card>
      </div>
    </div>
  );
};

export default VendeurDashboard;
