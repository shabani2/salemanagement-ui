/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import type { DataTablePassThroughOptions } from 'primereact/datatable';
import type { ColumnBodyOptions } from 'primereact/column';

import KpiCard from '../common/KpiCard';
import NoDataCard from '../common/NoDataCard';
import RegionDistributionPieChart from '../superadmin/charts/regionPieChart';
import AnalyseMouvementStockChart from '../superadmin/charts/evolutionProduitChart';
import MouvementStockAreaChart from '@/components/dashboards/superadmin/charts/mvtChart';

import { AppDispatch, RootState } from '@/stores/store';

import { fetchMouvementsStock, selectAllMouvementsStock } from '@/stores/slices/mvtStock/mvtStock';

import {
  fetchStocks,
  fetchStockByRegionId,
  fetchStockByPointVenteId,
  selectAllStocks,
} from '@/stores/slices/stock/stockSlice';

import {
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
  selectPointVenteMeta,
} from '@/stores/slices/pointvente/pointventeSlice';

import {
  fetchProduits,
  selectProduitMeta,
  selectProduitSearchMeta,
} from '@/stores/slices/produits/produitsSlice';

import { fetchCommandes, selectAllCommandes } from '@/stores/slices/commandes/commandeSlice';

import type { Stock } from '@/Models/stock';
import { Package, Box, CreditCard, Building, ClipboardList } from 'lucide-react';

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

import { motion } from 'framer-motion';
import { formatNombre } from '@/lib/utils';
import { computeRegionStats } from '@/lib/utils/DataConvertRegion';

/* ----------------------------- Utils ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

type Period = 'tout' | 'jour' | 'semaine' | 'mois' | 'annee';

/* -------------------------------- Component ------------------------------ */
export default function PrivilegiesDashboard() {
  const dispatch = useDispatch<AppDispatch>();

  // User (rôle)
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  /* ----------------------------- Selectors store ----------------------------- */
  const mouvements = useSelector((s: RootState) => asArray(selectAllMouvementsStock(s)));
  const stocks = useSelector((s: RootState) => asArray(selectAllStocks(s)));
  const commandes = useSelector((s: RootState) => asArray(selectAllCommandes(s)));

  // Produits -> total via meta
  const metaProduit = useSelector(selectProduitMeta);
  const searchMetaProduit = useSelector(selectProduitSearchMeta);
  const totalProduits = (false ? searchMetaProduit : metaProduit)?.total ?? 0;

  // Points de vente -> total via meta (KPI corrigé)
  const pointVenteMeta = useSelector(selectPointVenteMeta);
  const allPointVentesOnPage = useSelector((s: RootState) => asArray(selectAllPointVentes(s)));

  // total PV selon rôle :
  const totalPointsVente = useMemo(() => {
    // AdminPointVente : 1 PV (le sien), inutile de charger la liste
    if (user?.role === 'AdminPointVente' && isNonEmptyString(user?.pointVente?._id)) {
      return 1;
    }
    // sinon on lit la meta globale fournie par le slice (normalisée)
    if (pointVenteMeta?.total != null) return pointVenteMeta.total;

    // fallback (au cas où) : longueur de la page courante
    return allPointVentesOnPage.length;
  }, [user?.role, user?.pointVente?._id, pointVenteMeta?.total, allPointVentesOnPage.length]);

  /* ----------------------------- Filtre temps ----------------------------- */
  const [period, setPeriod] = useState<Period>('mois');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()); // 0..11

  const buildRange = () => {
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
  };

  /* ----------------------------- Chargement Data ----------------------------- */

  // Produits (uniquement pour meta.total)
  useEffect(() => {
    dispatch(fetchProduits({ page: 1, limit: 1, includeTotal: true }));
  }, [dispatch]);

  // Points de vente (selon rôle) — forcer includeTotal pour KPI correct
  useEffect(() => {
    if (!user?.role) return;

    if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      dispatch(
        fetchPointVentesByRegionId({
          regionId: user.region._id,
          page: 1,
          limit: 1,
          includeTotal: true,
        }) as any
      );
    } else if (user?.role !== 'AdminPointVente') {
      // SuperAdmin (et autres rôles non-PV) : on veut juste la meta
      dispatch(fetchPointVentes({ page: 1, limit: 1, includeTotal: true }) as any);
    }
  }, [dispatch, user?.role, user?.region?._id]);

  // Stocks (selon rôle)
  useEffect(() => {
    if (!user?.role) return;
    if (user?.role === 'AdminPointVente' && isNonEmptyString(user?.pointVente?._id)) {
      dispatch(fetchStockByPointVenteId(user.pointVente._id));
    } else if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      dispatch(fetchStockByRegionId(user.region._id));
    } else {
      dispatch(fetchStocks({}));
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  // Commandes (pour KPI "en attente")
  useEffect(() => {
    dispatch(fetchCommandes({ includeTotal: true }) as any);
  }, [dispatch]);

  // Mouvements (selon rôle + période)
  useEffect(() => {
    if (!user?.role) return;
    const { dateFrom, dateTo } = buildRange();

    const base: any = {
      page: 1,
      limit: 200,
      includeRefs: true,
      includeTotal: true,
      sortBy: 'createdAt',
      order: 'desc',
      dateFrom,
      dateTo,
      preferServerPage: true,
    };

    if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      base.region = user.region._id;
    }
    if (user?.role === 'AdminPointVente' && isNonEmptyString(user?.pointVente?._id)) {
      base.pointVente = user.pointVente._id;
    }

    dispatch(fetchMouvementsStock(base));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id, period, month, year]);

  /* ------------------------------ KPIs & dérivés ----------------------------- */

  // Commandes en attente
  const totalCommandesAttente = useMemo(
    () => commandes.filter((c: any) => c?.statut === 'attente').length,
    [commandes]
  );

  // Chiffre d’affaires = somme montants des mouvements "Vente" (filtrés par période + rôle)
  const chiffreAffaires = useMemo(
    () =>
      mouvements
        //@ts-ignore
        .filter((m) => m?.type === 'Vente')
        //@ts-ignore
        .reduce((acc, m) => acc + (Number(m?.montant) || 0), 0),
    [mouvements]
  );

  // Stock snapshot total (somme des montants courants)
  const stockSnapshotTotal = useMemo(
    //@ts-ignore
    () => stocks.reduce((acc, s) => acc + (Number(s?.montant) || 0), 0),
    [stocks]
  );

  // Produits critiques (stock < seuil)
  const produitsCritiques = useMemo(() => {
    return stocks.filter((row) => {
      //@ts-ignore
      const seuil = row?.produit?.seuil ?? 0;
      //@ts-ignore
      const quantite = row?.quantite ?? 0;
      return quantite < seuil;
    });
  }, [stocks]);

  // Tableaux Région/PV basés sur mouvements filtrés
  const regionStats = useMemo(() => {
    return computeRegionStats(
      //@ts-ignore
      mouvements,
      user?.role,
      user?.role === 'AdminRegion' ? user?.region : undefined
    );
  }, [mouvements, user?.role, user?.region]);

  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');

  /* ---------------------------------- UI ---------------------------------- */
  const hasMouvements = mouvements.length > 0;
  const hasRegionStats =
    Array.isArray(regionStats) &&
    regionStats.length > 0 &&
    (regionStats[0]?.role === 'SuperAdmin' ||
      (regionStats[0]?.role === 'AdminRegion' && Array.isArray(regionStats[0]?.pointVentes)));

  // === Helpers d'affichage pour la période sélectionnée ===
  const PERIOD_LABELS: Record<Period, string> = {
    tout: 'Tout',
    jour: 'Jour',
    semaine: 'Semaine',
    mois: 'Mois',
    annee: 'Année',
  };

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

  const selectedPeriodText = useMemo(() => {
    const now = new Date();
    if (period === 'jour') {
      return format(now, 'dd/MM/yyyy');
    }
    if (period === 'semaine') {
      const from = startOfWeek(now, { weekStartsOn: 1 });
      const to = endOfWeek(now, { weekStartsOn: 1 });
      return `${format(from, 'dd/MM')} – ${format(to, 'dd/MM/yyyy')}`;
    }
    if (period === 'mois') {
      return `${MONTHS_SHORT[month]} ${year}`;
    }
    if (period === 'annee') {
      return String(year);
    }
    return 'Toutes périodes';
  }, [period, month, year]);

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Tableau de bord' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-5000">du {formattedDate}</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* --- Filtre de temps --- */}
        <div className="flex flex-wrap items-center gap-3 justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {/* Contrôles gauche */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-100">
              <i className="pi pi-calendar-clock text-[12px]" />
              Filtre temporel
            </span>

            {/* Sélecteur période */}
            <div className="relative">
              <select
                className="appearance-none border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition"
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
              >
                <option value="tout">Tout</option>
                <option value="jour">Jour</option>
                <option value="semaine">Semaine</option>
                <option value="mois">Mois</option>
                <option value="annee">Année</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <i className="pi pi-chevron-down text-xs" />
              </span>
            </div>

            {/* Sélecteur mois + année quand period = mois */}
            {period === 'mois' && (
              <>
                <div className="relative">
                  <select
                    className="appearance-none border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTHS_SHORT.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="pi pi-chevron-down text-xs" />
                  </span>
                </div>

                <input
                  type="number"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  placeholder="Année"
                  min={2000}
                  max={2100}
                />
              </>
            )}

            {/* Sélecteur année quand period = annee */}
            {period === 'annee' && (
              <input
                type="number"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="Année"
                min={2000}
                max={2100}
              />
            )}
          </div>

          {/* Résumé sélection à droite */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-gray-500">Sélection&nbsp;:</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
              <i className="pi pi-clock text-[12px] text-gray-500" />
              <span className="whitespace-nowrap">
                {PERIOD_LABELS[period]} • {selectedPeriodText}
              </span>
            </span>
          </div>
        </div>

        {/* --- KPIs --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KpiCard title="Total Produits" value={formatNombre(totalProduits)} icon={Package} />
          <KpiCard title="Points de Vente" value={formatNombre(totalPointsVente)} icon={Building} />
          <KpiCard
            title="Chiffre d'affaires (FC)"
            // @ts-expect-error - compat
            value={formatNombre(chiffreAffaires)}
            icon={CreditCard}
          />
          <KpiCard
            title="Commandes en attente"
            value={formatNombre(totalCommandesAttente)}
            icon={ClipboardList}
          />
          <KpiCard
            title="Stock Total (FC)"
            // @ts-expect-error - compat
            value={formatNombre(stockSnapshotTotal)}
            icon={Box}
          />
        </div>

        {/* --- Graphique + Produits critiques --- */}
        <div className="w-full flex gap-4">
          <div className="rounded-lg shadow-md mb-4 w-full md:w-8/12">
            {hasMouvements ? (
              <MouvementStockAreaChart
                //@ts-ignore
                data={mouvements}
                userRole={user?.role}
                region={user?.role === 'AdminRegion' ? user?.region : undefined}
                pointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
                operationType="Vente"
              />
            ) : (
              <NoDataCard
                title="Aucune donnée de mouvement"
                message="Aucun mouvement trouvé pour la période sélectionnée."
              />
            )}
          </div>

          <div className="rounded-lg shadow-md mb-4 w-full md:w-4/12 bg-gradient-to-br from-green-50 to-white overflow-hidden border border-green-100 transition-all duration-300">
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
            >
              <DataTable
                //@ts-ignore
                value={produitsCritiques /* as Stock[] */}
                dataKey="_id"
                paginator
                size="small"
                rows={10}
                rowsPerPageOptions={[10, 20, 50]}
                paginatorPosition="bottom"
                paginatorClassName="justify-end"
                showCurrentPageReport
                currentPageReportTemplate="Ligne {first} à {last} sur {totalRecords}"
                header="Produits Critiques"
                emptyMessage={
                  <NoDataCard
                    title="Aucun produit critique"
                    message="Tous les stocks sont au-dessus du seuil."
                  />
                }
                scrollable
                responsiveLayout="scroll"
                className="rounded-lg text-[11px] !text-gray-500 p-datatable-sm"
                pt={
                  {
                    root: { className: '!bg-transparent' },
                    header: { className: '!bg-transparent' },
                    table: { className: '!bg-transparent' },
                    tbody: { className: '!bg-transparent' },
                  } as DataTablePassThroughOptions
                }
              >
                <Column
                  header="#"
                  body={(_row, options: ColumnBodyOptions) => (options?.rowIndex ?? 0) + 1}
                  className="px-4 py-1 text-[11px]"
                  headerClassName="text-[11px] !bg-green-900 !text-white"
                />
                <Column
                  header="Stock"
                  body={(rowData: Stock) => rowData?.pointVente?.nom || 'Dépôt Central'}
                  className="px-4 py-1 text-[11px]"
                  headerClassName="text-[11px] !bg-green-900 !text-white"
                />
                <Column
                  header="Produit"
                  body={(rowData: Stock) => (rowData as any)?.produit?.nom || 'N/A'}
                  className="px-4 py-1 text-[11px]"
                  headerClassName="text-[11px] !bg-green-900 !text-white"
                />
                <Column
                  header="Quantité"
                  body={(rowData: Stock) => {
                    const quantite = (rowData as any)?.quantite ?? 0;
                    return (
                      <span
                        className="flex items-center gap-1 text-[11px] px-2 py-1"
                        style={{
                          backgroundColor: '#f44336',
                          borderRadius: '9999px',
                          color: '#fff',
                        }}
                      >
                        <i className="pi pi-exclamation-triangle" style={{ fontSize: '0.75rem' }} />
                        <span>{quantite}</span>
                        <span className="ml-1">Insuffisant</span>
                      </span>
                    );
                  }}
                  className="px-4 py-1 text-[11px]"
                  headerClassName="text-[11px] !bg-green-900 !text-white"
                />
              </DataTable>
            </motion.div>
          </div>
        </div>

        {/* --- Evolution détaillée --- */}
        <div className="flex w-full rounded-lg shadow-md mb-4">
          {hasMouvements ? (
            <AnalyseMouvementStockChart
              // @ts-expect-error - compat
              data={mouvements}
              userRole={user?.role}
              initialRegion={user?.role === 'AdminRegion' ? user?.region : undefined}
              initialPointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
            />
          ) : (
            <NoDataCard
              title="Aucune donnée de mouvement"
              message="Aucun mouvement trouvé pour la période sélectionnée."
            />
          )}
        </div>

        {/* --- Tableaux par région / PV --- */}
        <div className="w-full flex gap-5">
          <div className="w-full md:w-9/12 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 p-2">
            {hasRegionStats ? (
              <>
                {regionStats[0]?.role === 'SuperAdmin' && (
                  <DataTable
                    value={regionStats}
                    paginator
                    size="small"
                    rows={10}
                    responsiveLayout="scroll"
                    className="p-datatable-sm !bg-transparent rounded-lg text-[11px]"
                    dataKey="region"
                    currentPageReportTemplate="Ligne {first} à {last} sur {totalRecords}"
                    rowsPerPageOptions={[10, 20, 50]}
                    paginatorPosition="bottom"
                    paginatorClassName="justify-end"
                    header="Résumé des régions"
                    emptyMessage={<NoDataCard title="Aucune donnée" message="Rien à afficher." />}
                    scrollable
                  >
                    <Column field="region" header="Région" sortable />
                    <Column field="nombrepointvente" header="Nb Points Vente" sortable />
                    <Column field="nombreproduit" header="Nb Produits" sortable />
                    <Column
                      field="Entrée"
                      header="Entrée (FC)"
                      sortable
                      body={(r) => r?.Entrée?.toLocaleString()}
                    />
                    <Column
                      field="Sortie"
                      header="Sortie (FC)"
                      sortable
                      body={(r) => r?.Sortie?.toLocaleString()}
                    />
                    <Column
                      field="Vente"
                      header="Vente (FC)"
                      sortable
                      body={(r) => r?.Vente?.toLocaleString()}
                    />
                    <Column
                      field="Livraison"
                      header="Livraison (FC)"
                      sortable
                      body={(r) => r?.Livraison?.toLocaleString()}
                    />
                    <Column
                      field="Commande"
                      header="Commande (FC)"
                      sortable
                      body={(r) => r?.Commande?.toLocaleString()}
                    />
                  </DataTable>
                )}

                {regionStats[0]?.role === 'AdminRegion' &&
                  Array.isArray(regionStats[0]?.pointVentes) && (
                    <DataTable
                      value={regionStats[0].pointVentes}
                      paginator
                      size="small"
                      rows={10}
                      responsiveLayout="scroll"
                      className="p-datatable-sm !bg-gray-50 !text-gray-500 rounded-lg text-[11px]"
                      dataKey="pointVenteId"
                      currentPageReportTemplate="Ligne {first} à {last} sur {totalRecords}"
                      rowsPerPageOptions={[10, 20, 50]}
                      paginatorPosition="bottom"
                      paginatorClassName="justify-end"
                      header={`Résumé de la région : ${regionStats[0].region}`}
                      emptyMessage={<NoDataCard title="Aucune donnée" message="Rien à afficher." />}
                      scrollable
                    >
                      <Column field="nom" header="Point de vente" sortable />
                      <Column field="nombreproduit" header="Nb Produits" sortable />
                      <Column
                        field="Entrée"
                        header="Entrée (FC)"
                        sortable
                        body={(r) => r?.Entrée?.toLocaleString()}
                      />
                      <Column
                        field="Sortie"
                        header="Sortie (FC)"
                        sortable
                        body={(r) => r?.Sortie?.toLocaleString()}
                      />
                      <Column
                        field="Vente"
                        header="Vente (FC)"
                        sortable
                        body={(r) => r?.Vente?.toLocaleString()}
                      />
                      <Column
                        field="Livraison"
                        header="Livraison (FC)"
                        sortable
                        body={(r) => r?.Livraison?.toLocaleString()}
                      />
                      <Column
                        field="Commande"
                        header="Commande (FC)"
                        sortable
                        body={(r) => r?.Commande?.toLocaleString()}
                      />
                    </DataTable>
                  )}
              </>
            ) : (
              <NoDataCard
                title="Aucune synthèse région/PV"
                message="Aucune donnée agrégée sur la période."
              />
            )}
          </div>

          <div className="w-full md:w-3/12 rounded-lg shadow-md mb-4">
            {hasMouvements ? (
              <RegionDistributionPieChart
                //@ts-ignore
                data={mouvements}
                userRole={user?.role}
                region={user?.role === 'AdminRegion' ? user?.region : undefined}
                pointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
              />
            ) : (
              <NoDataCard
                title="Aucune répartition"
                message="Pas de données de mouvement à répartir."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
