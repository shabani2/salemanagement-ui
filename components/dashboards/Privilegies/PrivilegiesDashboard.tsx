/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
// imports à ajouter en haut du fichier si pas déjà présents :
import type { DataTablePassThroughOptions } from 'primereact/datatable';
import type { ColumnBodyOptions } from 'primereact/column';

import KpiCard from '../common/KpiCard';
import RegionDistributionPieChart from '../superadmin/charts/regionPieChart';
import AnalyseMouvementStockChart from '../superadmin/charts/evolutionProduitChart';
import MouvementStockAreaChart from '@/components/dashboards/superadmin/charts/mvtChart';

import { AppDispatch, RootState } from '@/stores/store';
import { useDispatch, useSelector } from 'react-redux';

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
} from '@/stores/slices/pointvente/pointventeSlice';

import { fetchProduits } from '@/stores/slices/produits/produitsSlice';

import type { Produit } from '@/Models/produitsType';
import type { Stock } from '@/Models/stock';

import { Package, Box, CreditCard, Building } from 'lucide-react';
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

import { computeRegionStats } from '@/lib/utils/DataConvertRegion';
import { motion } from 'framer-motion';
import { formatNombre } from '@/lib/utils';

/* ----------------------------- Utils locaux ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

type Period = 'tout' | 'jour' | 'semaine' | 'mois' | 'annee';

/* -------------------------------- Component ------------------------------ */
export default function PrivilegiesDashboard() {
  const dispatch = useDispatch<AppDispatch>();

  // User local (pour les rôles)
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  // Store selectors
  const allMvtStocks = useSelector((state: RootState) => asArray(selectAllMouvementsStock(state)));
  const stocks = useSelector((state: RootState) => asArray(selectAllStocks(state)));
  const pointsVente = useSelector((state: RootState) => asArray(selectAllPointVentes(state)));

  // Produits (locaux)
  const [produits, setProduits] = useState<Produit[]>([]);

  /* ----------------------------- Filtre de temps ----------------------------- */
  const [period, setPeriod] = useState<Period>('mois');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()); // 0..11

  // Construit le range {dateFrom,dateTo} à envoyer au back
  const buildRange = () => {
    const now = new Date();
    if (period === 'tout') return { dateFrom: undefined, dateTo: undefined };
    if (period === 'jour')
      return { dateFrom: startOfDay(now).toISOString(), dateTo: endOfDay(now).toISOString() };
    if (period === 'semaine') {
      const df = startOfWeek(now, { weekStartsOn: 1 }); // lundi
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

  // Produits
  useEffect(() => {
    dispatch(fetchProduits()).then((resp: any) => {
      setProduits(asArray<Produit>(resp?.payload));
    });
  }, [dispatch]);

  // Points de vente (selon rôle)
  useEffect(() => {
    if (!user?.role) return;
    if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      dispatch(fetchPointVentesByRegionId(user.region._id));
    } else {
      dispatch(fetchPointVentes());
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
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  // Mouvements (selon rôle + filtre temps)
  useEffect(() => {
    if (!user?.role) return;

    const { dateFrom, dateTo } = buildRange();
    const base: any = {
      page: 1,
      limit: 200, // ajuste selon tes volumes
      includeRefs: true,
      includeTotal: true,
      sortBy: 'createdAt',
      order: 'desc',
      dateFrom,
      dateTo,
    };

    if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      base.region = user.region._id;
    }
    if (user?.role === 'AdminPointVente' && isNonEmptyString(user?.pointVente?._id)) {
      base.pointVente = user.pointVente._id;
    }

    // un seul thunk : la route GET /mouvements supporte bien dateFrom/dateTo
    dispatch(fetchMouvementsStock(base));
    //@ts-ignore
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id, period, month, year]);

  /* ------------------------------ KPIs & derived ----------------------------- */

  const totalProduits = produits.length;
  const totalPointsVente = pointsVente.length;

  const stockTotalValue = useMemo(
    //@ts-ignore
    () => stocks.reduce((acc, s) => acc + (Number(s.montant) || 0), 0),
    [stocks]
  );

  const caGlobal = useMemo(
    () =>
      allMvtStocks
        //@ts-ignore
        .filter((m) => m.type === 'Vente')
        //@ts-ignore
        .reduce((acc, m) => acc + (Number(m.montant) || 0), 0),
    [allMvtStocks]
  );

  // const totalCommandes = useMemo(
  //   //@ts-ignore
  //   () => allMvtStocks.filter((m) => m.type === 'Commande').length,
  //   [allMvtStocks]
  // );

  // const totalLivraisons = useMemo(
  //   //@ts-ignore
  //   () => allMvtStocks.filter((m) => m.type === 'Livraison').length,
  //   [allMvtStocks]
  // );

  // const tauxLivraison =
  //   totalCommandes > 0 ? Math.round((totalLivraisons / totalCommandes) * 100) : 0;

  const regionStats = useMemo(() => {
    return computeRegionStats(
      //@ts-ignore
      allMvtStocks,
      user?.role,
      user?.role === 'AdminRegion' ? user?.region : undefined
    );
  }, [allMvtStocks, user?.role, user?.region]);

  // Produits critiques (stock < seuil)
  const produitsCritiques = useMemo(() => {
    return stocks.filter((row) => {
      //@ts-ignore
      const seuil = row.produit?.seuil ?? 0;
      //@ts-ignore
      const quantite = row.quantite ?? 0;
      return quantite < seuil;
    });
  }, [stocks]);

  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');

  /* ---------------------------------- UI ---------------------------------- */
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
        {/* --- Filtre de temps imbriqué --- */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700">Période</label>
          <select
            className="border rounded px-2 py-1 text-sm"
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

          {period === 'mois' && (
            <>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {[
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
                ].map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="border rounded px-2 py-1 w-24 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="Année"
                min={2000}
                max={2100}
              />
            </>
          )}

          {period === 'annee' && (
            <input
              type="number"
              className="border rounded px-2 py-1 w-24 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              placeholder="Année"
              min={2000}
              max={2100}
            />
          )}
        </div>

        {/* --- KPIs --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KpiCard title="Total Produits" value={formatNombre(totalProduits)} icon={Package} />
          <KpiCard
            title="Stock Total (fc)"
            // @ts-expect-error - compat: external lib types mismatch
            value={formatNombre(stockTotalValue)}
            icon={Box}
          />
          <KpiCard
            title="CA Global"
            // @ts-expect-error - compat: external lib types mismatch
            value={formatNombre(caGlobal)}
            icon={CreditCard}
          />
          <KpiCard title="Points de Vente" value={formatNombre(totalPointsVente)} icon={Building} />
          {/* <KpiCard title="Taux Livraison" value={`${tauxLivraison}%`} icon={Truck} /> */}
        </div>

        {/* --- Graphique + Produits critiques --- */}
        <div className="w-full flex gap-4">
          <div className="rounded-lg shadow-md  mb-4 w-full md:w-8/12">
            <MouvementStockAreaChart
              //@ts-ignore
              data={allMvtStocks}
              userRole={user?.role}
              region={user?.role === 'AdminRegion' ? user?.region : undefined}
              pointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
              operationType="Vente"
            />
          </div>

          <div className="rounded-lg shadow-md mb-4 w-full md:w-4/12 bg-gradient-to-br from-green-50 to-white  overflow-hidden border border-green-100 transition-all duration-300">
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
                emptyMessage="Aucun produit critique trouvé."
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
                  body={(rowData: Stock) => rowData.pointVente?.nom || 'Dépôt Central'}
                  className="px-4 py-1 text-[11px]"
                  headerClassName="text-[11px] !bg-green-900 !text-white"
                />
                <Column
                  header="Produit"
                  body={(rowData: Stock) => rowData.produit?.nom || 'N/A'}
                  className="px-4 py-1 text-[11px]"
                  headerClassName="text-[11px] !bg-green-900 !text-white"
                />
                <Column
                  header="Quantité"
                  body={(rowData: Stock) => {
                    const quantite = rowData.quantite ?? 0;
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
          {user && (
            <AnalyseMouvementStockChart
              // @ts-expect-error - compat: external lib types mismatch
              data={allMvtStocks}
              userRole={user?.role}
              initialRegion={user?.role === 'AdminRegion' ? user?.region : undefined}
              initialPointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
            />
          )}
        </div>

        {/* --- Tableaux par région / PV --- */}
        <div className="w-full flex gap-5">
          <div className="w-full md:w-9/12 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300">
            {Array.isArray(regionStats) && regionStats[0]?.role === 'SuperAdmin' && (
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
                emptyMessage="Aucune donnée disponible."
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
              </DataTable>
            )}

            {Array.isArray(regionStats) && regionStats[0]?.role === 'AdminRegion' && (
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
                emptyMessage="Aucune donnée disponible."
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
          </div>

          <div className="w-full md:w-3/12 rounded-lg shadow-md mb-4">
            <RegionDistributionPieChart
              //@ts-ignore
              data={allMvtStocks}
              userRole={user?.role}
              region={user?.role === 'AdminRegion' ? user?.region : undefined}
              pointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
