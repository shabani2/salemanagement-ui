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
//import { mockData } from '@/lib/mockData';
import { PointVente } from '@/Models/pointVenteType';
import { MouvementStock } from '@/Models/mouvementStockType';
import MouvementStockChart from './charts/mvtChart';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import {
  fetchMouvementsStock,
  fetchMouvementStockByPointVenteId,
  selectAllMouvementsStock,
} from '@/stores/slices/mvtStock/mvtStock';
import MouvementStockAreaChart from './charts/mvtChart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { computeRegionStats } from '@/lib/utils/DataConvertRegion';
//import RegionDistributionPieChart from './charts/regionPiehatr';
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

// Données simulées

export default function SuperAdminDashboard() {
  // const { produits, stocks, mouvementsStock, pointsVente } = mockData;

  // États de filtrage
  // const [filteredMouvements, setFilteredMouvements] = useState(mouvementsStock);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [selectedType, setSelectedType] = useState<string>('Tout');
  const dispatch = useDispatch<AppDispatch>();
  const stocks = useSelector((state: RootState) => selectAllStocks(state));
  const allMvtStocks = useSelector((state: RootState) => selectAllMouvementsStock(state));
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  useEffect(() => {
    if (!user?.role) return;
    if (user?.role === 'SuperAdmin' || user?.role === 'AdminRegion') {
      dispatch(fetchMouvementsStock());
    } else {
      dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id));
    }
  }, [dispatch, user?.pointVente?._id, user?.role]);

  // -----------------------------
  // Calcul des KPIs
  // -----------------------------
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));
  useEffect(() => {
    dispatch(fetchPointVentes());
    // dispatch(fetchRegions());
  }, [dispatch]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  useEffect(() => {
    //dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      setAllProduits(resp.payload); // garde la version complète
      setProduits(resp.payload); // version visible (filtrée ou pas)
    });
  }, [dispatch]);
  const totalProduits = produits.length;
  const stockTotalValue = stocks.reduce((acc, s) => acc + s.montant, 0);
  const caGlobal = allMvtStocks
    .filter((m) => m.type === 'Vente')
    .reduce((acc, m) => acc + m.montant, 0);
  const totalPointsVente = pointsVente.length;

  const totalCommandes = allMvtStocks.filter((m) => m.type === 'Commande').length;
  const totalLivraisons = allMvtStocks.filter((m) => m.type === 'Livraison').length;
  const tauxLivraison =
    totalCommandes > 0 ? `${Math.round((totalLivraisons / totalCommandes) * 100)}%` : 'N/A';

  // -----------------------------
  // Gestion des filtres
  // -----------------------------
  const handleTimeChange = (data: MouvementStock[]) => {
    // setFilteredMouvements(data);
  };

  const handlePointVenteChange = (pv: PointVente | null) => {
    setSelectedPointVente(pv);
    const filtered = pv ? allMvtStocks.filter((m) => m.pointVente?._id === pv._id) : allMvtStocks;
    //  setFilteredMouvements(filtered);
  };

  const handleTypeChange = (_: MouvementStock[], type: string | null) => {
    setSelectedType(type || 'Tout');
  };

  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('mois');
  // -----------------------------
  // Données préparées pour les tableaux
  // -----------------------------
  const dernièresVentes = allMvtStocks.filter((m) => m.type === 'Vente');
  const produitsCritiques = stocks.filter((s) => s.quantite < 30);
  const activitéStock = allMvtStocks.filter((m) => m.type !== 'Vente');
  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.pointVente?._id, user?.role]);

  const filteredData = useMemo(() => {
    return stocks.filter((rowData) => {
      const seuil = rowData.produit?.seuil ?? 0;
      const quantite = rowData.quantite ?? 0;
      return quantite < seuil;
    });
  }, [stocks]);

  return (
    <div className="p-4 space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4">
        <DropdownTimeFilter data={allMvtStocks} onChange={handleTimeChange} />
        <DropdownPointVenteFilter onSelect={handlePointVenteChange} />
        <DropdownTypeFilter mvtStocks={allMvtStocks} onChange={handleTypeChange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard title="Total Produits" value={totalProduits} icon={Package} />
        <KpiCard title="Stock Total (fc)" value={`${stockTotalValue.toFixed(1)} fc`} icon={Box} />
        <KpiCard title="CA Global" value={`${caGlobal.toFixed(1)} fc`} icon={CreditCard} />
        <KpiCard title="Points de Vente" value={totalPointsVente} icon={Building} />
        <KpiCard title="Taux Livraison" value={tauxLivraison} icon={Truck} />
      </div>

      {/* Graphiques */}

      {/* gestion stock*/}
      <div className="w-full flex gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 w-full md:w-8/12">
          <EvolutionProduitRegionChart
            data={allMvtStocks}
            //@ts-ignore
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
            {/* <Column
          header="Région"
          body={(rowData: Stock) => {
            const region = rowData.pointVente?.region;
            return typeof region === 'object' && region !== null && 'nom' in region
              ? (region as { nom: string }).nom
              : typeof region === 'string'
                ? region
                : 'N/A';
          }}
          className="px-4 py-1 text-[11px]"
          headerClassName="text-[11px] !bg-green-900 !text-white"
        /> */}
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
                const seuil = rowData.produit?.seuil ?? 0;
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
      {/* evolution dans le temps */}
      <div className="flex w-full bg-white rounded-lg shadow-md p-4 mb-4">
        <MouvementStockAreaChart
          data={allMvtStocks}
          userRole={user?.role as 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente'}
        />
      </div>

      <div className="w-full flex gap-5">
        <div className="w-full md:w-9/12 bg-white rounded-lg shadow-md p-4 mb-4">
          <DataTable
            //@ts-ignore
            value={computeRegionStats(allMvtStocks)}
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
              body={(rowData) => rowData.Entrée.toLocaleString()}
            ></Column>
            <Column
              field="Sortie"
              header="Sortie (FC)"
              sortable
              body={(rowData) => rowData.Sortie.toLocaleString()}
            ></Column>
            <Column
              field="Vente"
              header="Vente (FC)"
              sortable
              body={(rowData) => rowData.Vente.toLocaleString()}
            ></Column>
            <Column
              field="Livraison"
              header="Livraison (FC)"
              sortable
              body={(rowData) => rowData.Livraison.toLocaleString()}
            ></Column>
            <Column
              field="Commande"
              header="Commande (FC)"
              sortable
              body={(rowData) => rowData.Commande.toLocaleString()}
            ></Column>
          </DataTable>
        </div>
        <div className="w-full md:w-3/12 bg-white rounded-lg shadow-md p-4 mb-4">
          <RegionDistributionPieChart
            //@ts-ignore
            data={computeRegionStats(allMvtStocks)}
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
