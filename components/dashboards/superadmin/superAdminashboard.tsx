/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useEffect, useMemo, useState } from 'react';

// Composants UI
import KpiCard from '@/components/dashboards/common/KpiCard';
import ChartCard from '@/components/dashboards/common/chardCard';
import TableCard from '@/components/dashboards/common/tableCard';

// Filtres
import DropdownTimeFilter from '@/components/ui/dropdowns/dropDownTimeFilter';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import DropdownTypeFilter from '@/components/ui/dropdowns/dropDownFile-filter';

// Icônes
import { Package, Box, CreditCard, Building, Truck } from 'lucide-react';
import { PointVente } from '@/Models/pointVenteType';
import { MouvementStock } from '@/Models/mouvementStockType';
import MouvementStockAreaChart from './charts/mvtChart';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import {
  fetchMouvementsStock,
 
  selectAllMouvementsStock,
} from '@/stores/slices/mvtStock/mvtStock';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { computeRegionStats } from '@/lib/utils/DataConvertRegion';
import {
  fetchStockByPointVenteId,
  fetchStocks,
  selectAllStocks,
} from '@/stores/slices/stock/stockSlice';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { Produit } from '@/Models/produitsType';
import { fetchProduits } from '@/stores/slices/produits/produitsSlice';
import { Stock } from '@/Models/stock';
import EvolutionProduitRegionChart from './charts/evolutionProduitChart';
import RegionDistributionPieChart from './charts/regionPieChart';

/* ----------------------------- Helpers ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/* -------------------------------- Page -------------------------------- */
export default function SuperAdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();

  // Filtres UI
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [selectedType, setSelectedType] = useState<string>('Tout'); // UI only, pas envoyé si "Tout"
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('mois');

  // Store
  const stocks = useSelector((state: RootState) => selectAllStocks(state));
  const allMvtStocks = useSelector((state: RootState) => selectAllMouvementsStock(state));
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));

  // User (client)
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  /* -------------------- Chargements initiaux -------------------- */
  useEffect(() => {
    dispatch(fetchPointVentes());
  }, [dispatch]);

  // Produits (KPI)
  const [produits, setProduits] = useState<Produit[]>([]);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  useEffect(() => {
    dispatch(fetchProduits()).then((resp: any) => {
      setAllProduits(resp.payload ?? []);
      setProduits(resp.payload ?? []);
    });
  }, [dispatch]);

  // Stocks
  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
      if (isNonEmptyString((user as any)?.pointVente?._id)) {
        dispatch(fetchStockByPointVenteId((user as any).pointVente._id));
      }
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.pointVente?._id, user?.role]);

  /* -------------------- Filtres serveur unifiés -------------------- */
  // On ne met PAS de filtre type tant que l’utilisateur n’a pas choisi un type explicite différent de "Tout".
  const serverFilters = useMemo(() => {
    const f: Record<string, any> = {
      includeTotal: true,
      includeRefs: true,
      sortBy: 'createdAt',
      order: 'desc',
      // NOTE: pas de q ici ; si tu ajoutes une barre de recherche, ajoute-la en q
    };

    // Filtre rôle par défaut
    if (user?.role === 'AdminPointVente' && isNonEmptyString((user as any)?.pointVente?._id)) {
      f.pointVente = (user as any).pointVente._id;
    } else if (user?.role === 'AdminRegion' && isNonEmptyString((user as any)?.region?._id)) {
      f.region = (user as any).region._id;
    }

    // Filtre PV choisi dans le dropdown (prend le dessus)
    if (selectedPointVente?._id) {
      f.pointVente = selectedPointVente._id;
      delete f.region;
    }

    // Type uniquement si explicite
    if (selectedType && selectedType !== 'Tout') {
      f.type = selectedType;
    }

    return f;
  }, [
    user?.role,
    (user as any)?.pointVente?._id,
    (user as any)?.region?._id,
    selectedPointVente?._id,
    selectedType,
  ]);

  // Chargement mouvements sur changement de filtres serveur
  useEffect(() => {
    dispatch(fetchMouvementsStock(serverFilters as any));
  }, [dispatch, serverFilters]);

  /* ----------------------------- KPI ----------------------------- */
  const totalProduits = produits.length;
  const stockTotalValue = stocks.reduce((acc, s) => acc + (s?.montant ?? 0), 0);
  const caGlobal = allMvtStocks
    .filter((m) => m.type === 'Vente')
    .reduce((acc, m) => acc + (m?.montant ?? 0), 0);
  const totalPointsVente = pointsVente.length;

  const totalCommandes = allMvtStocks.filter((m) => m.type === 'Commande').length;
  const totalLivraisons = allMvtStocks.filter((m) => m.type === 'Livraison').length;
  const tauxLivraison =
    totalCommandes > 0 ? `${Math.round((totalLivraisons / totalCommandes) * 100)}%` : 'N/A';

  /* ----------------------------- Handlers ----------------------------- */
  const handleTimeChange = (data: MouvementStock[]) => {
    // Tu pourras brancher un vrai filtre date serveur (dateFrom/dateTo) si besoin.
  };

  const handlePointVenteChange = (pv: PointVente | null) => {
    setSelectedPointVente(pv); // le useEffect serveur se déclenche et recharge côté API
  };

  const handleTypeChange = (_: MouvementStock[], type: string | null) => {
    // 'Tout' => pas de filtre serveur envoyé
    setSelectedType(type || 'Tout');
  };

  /* ----------------------------- Données tables ----------------------------- */
  const filteredData = useMemo(() => {
    return stocks.filter((rowData) => {
      const seuil = rowData.produit?.seuil ?? 0;
      const quantite = rowData.quantite ?? 0;
      return quantite < seuil;
    });
  }, [stocks]);

  const allMvtForCharts = allMvtStocks; // déjà filtrés côté serveur suivant PV/type

  return (
    <div className="p-4 space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4">
        <DropdownTimeFilter data={allMvtForCharts} onChange={handleTimeChange} />
        <DropdownPointVenteFilter onSelect={handlePointVenteChange} />
        <DropdownTypeFilter mvtStocks={allMvtForCharts}
        //@ts-ignore
         onChange={handleTypeChange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard title="Total Produits" value={totalProduits} icon={Package} />
        <KpiCard title="Stock Total (fc)" value={`${stockTotalValue.toFixed(1)} fc`} icon={Box} />
        <KpiCard title="CA Global" value={`${caGlobal.toFixed(1)} fc`} icon={CreditCard} />
        <KpiCard title="Points de Vente" value={totalPointsVente} icon={Building} />
        <KpiCard title="Taux Livraison" value={tauxLivraison} icon={Truck} />
      </div>

      {/* Graphiques & Table faible stock */}
      <div className="w-full flex gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 w-full md:w-8/12">
          <EvolutionProduitRegionChart
            data={allMvtForCharts}
            // @ts-expect-error - compat: external lib types mismatch
            operationType={
              selectedType === 'Tout'
                ? 'Vente'
                : (selectedType as 'Vente' | 'Entrée' | 'Sortie' | 'Livraison' | 'Commande')
            }
            userRole={user?.role as 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente'}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4 w-full md:w-4/12">
          <DataTable
            value={filteredData}
            dataKey="_id"
            paginator
            size="small"
            currentPageReportTemplate="Ligne {first} à {last} sur {totalRecords}"
            rowsPerPageOptions={[10, 20, 50]}
            paginatorPosition="bottom"
            paginatorClassName="justify-end"
            header="Produits Critiques"
            emptyMessage="Aucun produit critique trouvé."
            scrollable
            rows={10}
            responsiveLayout="scroll"
            className="rounded-lg text-[11px]"
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column
              header="Stock"
              body={(rowData: Stock) => rowData.pointVente?.nom || 'Depot Central'}
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
        </div>
      </div>

      {/* Evolution */}
      <div className="flex w-full bg-white rounded-lg shadow-md p-4 mb-4">
        <MouvementStockAreaChart
          data={allMvtForCharts}
          userRole={user?.role as 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente'}
        />
      </div>

      {/* Résumé des régions + Pie */}
      <div className="w-full flex gap-5">
        <div className="w-full md:w-9/12 bg-white rounded-lg shadow-md p-4 mb-4">
          <DataTable
            // @ts-expect-error - compat: external lib types mismatch
            value={computeRegionStats(allMvtForCharts)}
            paginator
            size="small"
            rows={10}
            responsiveLayout="scroll"
            className="p-datatable-sm"
            dataKey="_id"
            currentPageReportTemplate="Ligne {first} à {last} sur {totalRecords}"
            rowsPerPageOptions={[10, 20, 50]}
            paginatorPosition="bottom"
            paginatorClassName="justify-end"
            header="Résumé des régions"
            emptyMessage="Aucune donnée disponible."
            scrollable
          >
            <Column field="region" header="Région" sortable></Column>
            <Column field="nombrepointvente" header="Nb Points Vente" sortable></Column>
            <Column field="nombreproduit" header="Nb Produits" sortable></Column>
            <Column
              field="Entrée"
              header="Entrée (FC)"
              sortable
              body={(r) => r.Entrée.toLocaleString()}
            />
            <Column
              field="Sortie"
              header="Sortie (FC)"
              sortable
              body={(r) => r.Sortie.toLocaleString()}
            />
            <Column
              field="Vente"
              header="Vente (FC)"
              sortable
              body={(r) => r.Vente.toLocaleString()}
            />
            <Column
              field="Livraison"
              header="Livraison (FC)"
              sortable
              body={(r) => r.Livraison.toLocaleString()}
            />
            <Column
              field="Commande"
              header="Commande (FC)"
              sortable
              body={(r) => r.Commande.toLocaleString()}
            />
          </DataTable>
        </div>

        <div className="w-full md:w-3/12 bg-white rounded-lg shadow-md p-4 mb-4">
          <RegionDistributionPieChart
            // @ts-expect-error - compat: external lib types mismatch
            data={computeRegionStats(allMvtForCharts)}
            operationType={
              selectedType === 'Tout'
                ? 'Vente'
                : (selectedType as 'Vente' | 'Entrée' | 'Sortie' | 'Livraison' | 'Commande')
            }
          />
        </div>
      </div>
    </div>
  );
}
