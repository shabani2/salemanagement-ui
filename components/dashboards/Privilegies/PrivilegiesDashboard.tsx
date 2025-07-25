/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import DropdownTimeFilter from '@/components/ui/dropdowns/dropDownTimeFilter';
import KpiCard from '../common/KpiCard';
import RegionDistributionPieChart from '../superadmin/charts/regionPieChart';

import { AppDispatch, RootState } from '@/stores/store';
import {
  fetchMouvementsStock,
  fetchMouvementStockByRegionId,
  fetchMouvementStockByPointVenteId,
  selectAllMouvementsStock,
} from '@/stores/slices/mvtStock/mvtStock';
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
import { Produit } from '@/Models/produitsType';
import { Package, Box, CreditCard, Building, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { computeRegionStats } from '@/lib/utils/DataConvertRegion';
import AnalyseMouvementStockChart from '../superadmin/charts/evolutionProduitChart';
import { Stock } from '@/Models/stock';
//import { PointVente } from '@/Models/pointVenteType';
import MouvementStockAreaChart from '@/components/dashboards/superadmin/charts/mvtChart';
import { motion } from 'framer-motion';
import { formatNombre } from '@/lib/utils';

export default function PrivilegiesDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const allMvtStocks = useSelector((state: RootState) => selectAllMouvementsStock(state));
  const stocks = useSelector((state: RootState) => selectAllStocks(state));
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));

  const [produits, setProduits] = useState<Produit[]>([]);
  //const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('mois');

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  useEffect(() => {
    if (!user?.role) return;
    if (user?.role === 'SuperAdmin') {
      dispatch(fetchMouvementsStock());
    } else if (user?.role === 'AdminRegion') {
      dispatch(fetchMouvementStockByRegionId(user?.region?._id));
    } else {
      dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id));
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  useEffect(() => {
    if (user?.role === 'AdminRegion') {
      dispatch(fetchPointVentesByRegionId(user?.region._id));
    } else {
      dispatch(fetchPointVentes());
    }
  }, [dispatch, user?.role, user?.region?._id]);

  useEffect(() => {
    dispatch(fetchProduits()).then((resp) => {
      setProduits(resp.payload);
    });
  }, [dispatch]);

  useEffect(() => {
    if (user?.role === 'AdminPointVente') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else if (user?.role === 'AdminRegion') {
      dispatch(fetchStockByRegionId(user?.region?._id));
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  const totalProduits = produits.length;
  const totalPointsVente = pointsVente.length;
  const stockTotalValue = stocks.reduce((acc, s) => acc + s.montant, 0);
  const caGlobal = allMvtStocks
    .filter((m) => m.type === 'Vente')
    .reduce((acc, m) => acc + m.montant, 0);
  const totalCommandes = allMvtStocks.filter((m) => m.type === 'Commande').length;
  const totalLivraisons = allMvtStocks.filter((m) => m.type === 'Livraison').length;
  const tauxLivraison =
    totalCommandes > 0 ? `${Math.round((totalLivraisons / totalCommandes) * 100)}%` : 'N/A';

  // const produitsCritiques = useMemo(() => {
  //   return stocks.filter((s) => (s.quantite ?? 0) < (s.produit?.seuil ?? 0));
  // }, [stocks]);

  const regionStats = useMemo(() => {
    return computeRegionStats(
      allMvtStocks,
      user?.role,
      user?.role === 'AdminRegion' ? user?.region : undefined
    );
  }, [allMvtStocks, user?.role, user?.region]);

  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');

  // const { produits, stocks, mouvementsStock, pointsVente } = mockData;

  // États de filtrage
  // const [filteredMouvements, setFilteredMouvements] = useState(mouvementsStock);
  // const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [selectedType] = useState<string>('Tout');

  useEffect(() => {
    if (!user?.role) return;
    if (user?.role === 'SuperAdmin') {
      dispatch(fetchMouvementsStock());
    } else if (user?.role === 'AdminRegion') {
      dispatch(fetchMouvementStockByRegionId(user?.region?._id));
    } else if (user?.role === 'Vendeur') {
      console.log('filtre du stock par vendeur');
    } else if (user?.role === 'Logisticien') {
      console.log('filtre du stock par Logisticien');
    } else {
      dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id));
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  // -----------------------------
  // Calcul des KPIs
  // -----------------------------

  useEffect(() => {
    if (user?.role === 'AdminRegion') {
      dispatch(fetchPointVentesByRegionId(user?.region._id)).then((resp) => {
        console.log('donnees recu : ', resp.payload);
      });
    } else {
      dispatch(fetchPointVentes());
    }
    //dispatch(fetchRegions());
  }, [dispatch, user?.role, user?.region?._id]);
  //@ts-ignore
  // const [allProduits, setAllProduits] = useState<Produit[]>([]);
  useEffect(() => {
    //dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      //  setAllProduits(resp.payload); // garde la version complète
      setProduits(resp.payload); // version visible (filtrée ou pas)
    });
  }, [dispatch]);

  useEffect(() => {
    if (user?.role === 'AdminPointVente') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else if (user?.role === 'AdminRegion') {
      dispatch(fetchStockByRegionId(user?.region?._id));
    } else if (user?.role === 'Vendeur') {
      console.log('filtre du stock par vendeur');
    } else if (user?.role === 'Logisticien') {
      console.log('filtre du stock par Logisticien');
    } else {
      dispatch(fetchStocks()).then((resp) => {
        console.log('donnees du stock : ', resp.payload);
      });
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  const filteredData = useMemo(() => {
    return stocks.filter((rowData) => {
      const seuil = rowData.produit?.seuil ?? 0;
      const quantite = rowData.quantite ?? 0;
      return quantite < seuil;
    });
  }, [stocks]);

  return (
    <div>
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Tableau de bord' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-5000">du {formattedDate}</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <DropdownTimeFilter data={allMvtStocks} onChange={() => {}} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KpiCard title="Total Produits" value={formatNombre(totalProduits)} icon={Package} />
          <KpiCard title="Stock Total (fc)" value={formatNombre(stockTotalValue)} icon={Box} />
          <KpiCard title="CA Global" value={formatNombre(caGlobal)} icon={CreditCard} />
          <KpiCard title="Points de Vente" value={formatNombre(totalPointsVente)} icon={Building} />
          <KpiCard title="Taux Livraison" value={0} icon={Truck} />
        </div>
        {/* premiere section de graphique */}
        <div className="w-full flex gap-4">
          <div className="rounded-lg shadow-md  mb-4 w-full md:w-8/12">
            <MouvementStockAreaChart
              data={allMvtStocks}
              userRole={user?.role}
              region={user?.role === 'AdminRegion' ? user?.region : undefined}
              pointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
              ///@ts-ignore
              operationType={
                selectedType === 'Tout'
                  ? 'Vente'
                  : (selectedType as 'Vente' | 'Entrée' | 'Sortie' | 'Livraison' | 'Commande')
              }
            />
          </div>
          <div className=" rounded-lg shadow-md  mb-4 w-full md:w-4/12 bg-gradient-to-br from-green-50 to-white  overflow-hidden border border-green-100 transition-all duration-300">
            {/* <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
            >
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
                className="rounded-lg text-[11px] bg-transparent !text-gray-500 p-datatable-sm"
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
            </motion.div> */}
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
            >
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
                className="rounded-lg text-[11px] !text-gray-500 p-datatable-sm"
                pt={{
                  header: { className: '!bg-transparent' },
                  //@ts-ignore
                  body: { className: '!bg-transparent' },
                  wrapper: { className: '!bg-transparent' },
                  table: { className: '!bg-transparent' },
                  // row: { className: '!bg-transparent' },
                  // paginator: { className: '!bg-transparent' },
                }}
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
            </motion.div>
          </div>
        </div>

        {/* Evolution */}
        <div className="flex w-full rounded-lg shadow-md  mb-4">
          {user && (
            <AnalyseMouvementStockChart
              data={allMvtStocks}
              userRole={user?.role}
              initialRegion={user?.role === 'AdminRegion' ? user?.region : undefined}
              initialPointVente={user?.role === 'AdminPointVente' ? user?.pointVente : undefined}
              // operationType={
              //   selectedType === 'Tout'
              //     ? 'Vente'
              //     : (selectedType as 'Vente' | 'Entrée' | 'Sortie' | 'Livraison' | 'Commande')
              // }
            />
          )}
        </div>

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
                  body={(rowData) => rowData?.Entrée?.toLocaleString()}
                />
                <Column
                  field="Sortie"
                  header="Sortie (FC)"
                  sortable
                  body={(rowData) => rowData?.Sortie?.toLocaleString()}
                />
                <Column
                  field="Vente"
                  header="Vente (FC)"
                  sortable
                  body={(rowData) => rowData?.Vente?.toLocaleString()}
                />
                <Column
                  field="Livraison"
                  header="Livraison (FC)"
                  sortable
                  body={(rowData) => rowData?.Livraison?.toLocaleString()}
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
                  body={(rowData) => rowData?.Entrée?.toLocaleString()}
                />
                <Column
                  field="Sortie"
                  header="Sortie (FC)"
                  sortable
                  body={(rowData) => rowData?.Sortie?.toLocaleString()}
                />
                <Column
                  field="Vente"
                  header="Vente (FC)"
                  sortable
                  body={(rowData) => rowData?.Vente?.toLocaleString()}
                />
                <Column
                  field="Livraison"
                  header="Livraison (FC)"
                  sortable
                  body={(rowData) => rowData?.Livraison?.toLocaleString()}
                />
                <Column
                  field="Commande"
                  header="Commande (FC)"
                  sortable
                  body={(rowData) => rowData?.Commande?.toLocaleString()}
                />
              </DataTable>
            )}
          </div>

          <div className="w-full md:w-3/12  rounded-lg shadow-md mb-4">
            <RegionDistributionPieChart
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
