/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// app/dashboard/page.tsx ou similaire
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BreadCrumb } from 'primereact/breadcrumb';
import { format } from 'date-fns';

import DropdownTimeFilter from '@/components/ui/dropdowns/dropDownTimeFilter';
import DropdownTypeFilter from '@/components/ui/dropdowns/dropDownFile-filter';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import StatCard from '@/components/ui/kpiCard/statCard';

import {
  fetchMouvementsStock,
  fetchMouvementStockByPointVenteId,
  selectAllMouvementsStock,
} from '@/stores/slices/mvtStock/mvtStock';
import { AppDispatch, RootState } from '@/stores/store';

import { getOptionsByRole } from '@/lib/utils';
import { PointVente } from '@/Models/pointVenteType';
import { Categorie } from '@/Models/produitsType';
import { MouvementStock } from '@/Models/mouvementStockType';
//import LineChartCategoriesByPointVente from '@/components/ui/chartsComponents/LineChartCategoriesByPointVente';
//import CombinedChartProduitsQuantiteTemps from '@/components/ui/chartsComponents/LineChartCategoriesByPointVente';
import {
  fetchStockByPointVenteId,
  fetchStocks,
  selectAllStocks,
} from '@/stores/slices/stock/stockSlice';
import { Stock } from '@/Models/stock';

// ✅ Déclaré en dehors pour éviter les re-créations à chaque render
const allData = [
  { label: 'Aujourd’hui', value: 'today' },
  { label: 'Hier', value: 'yesterday' },
  { label: 'Cette semaine', value: 'thisWeek' },
  { label: 'Ce mois-ci', value: 'thisMonth' },
  { label: 'Cette année', value: 'thisYear' },
];

export default function Home() {
  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');

  const dispatch = useDispatch<AppDispatch>();
  const [filteredData, setFilteredData] = useState(allData);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  // const [categorie, setCategorie] = useState<Categorie | null>(null);
  // Replace 'MouvementStock' with the actual type/interface for your mouvement stock objects
  const [filteredMvtStocks, setFilteredMvtStocks] = useState<MouvementStock[]>([]);

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const allMvtStocks = useSelector((state: RootState) => selectAllMouvementsStock(state));

  const allowedTypes = useMemo(() => {
    const types = getOptionsByRole(user?.role).map((opt) => opt.value);
    return user?.role === 'AdminPointVente' ? [...types, 'Livraison'] : types;
  }, [user?.role]);

  const mvtStocks = useMemo(() => {
    return allMvtStocks.filter((mvt) => allowedTypes.includes(mvt.type));
  }, [allMvtStocks, allowedTypes]);

  const mvtOptions = getOptionsByRole(user?.role);
  const mvtDefault = mvtOptions[0]?.value || null;

  useEffect(() => {
    if (!user?.role) return;
    if (user.role === 'SuperAdmin' || user.role === 'AdminRegion') {
      dispatch(fetchMouvementsStock());
    } else {
      dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id));
    }
  }, [dispatch, user?.role]);

  useEffect(() => {
    if (mvtDefault) {
      setSelectedType(mvtDefault);
      setFilteredMvtStocks(mvtStocks.filter((s) => s.type === mvtDefault));
    }
  }, [mvtStocks, mvtDefault]);

  // ✅ useCallback pour éviter re-renders inutiles
  const handleTimeFilterChange = useCallback((filtered: typeof allData) => {
    setFilteredData(filtered);
  }, []);

  //stock
  const stocks = useSelector((state: RootState) => selectAllStocks(state));
  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.role]);

  // traitement de la recherche dans le stock
  const [search, setSearch] = useState('');
  const [filteredBase, setFilteredBase] = useState<Stock[]>(stocks);
  const [categorie, setCategorie] = useState<Categorie | null>(null);

  useEffect(() => {
    const filtered = mvtStocks.filter((row) => {
      const matchCategorie =
        !categorie ||
        //@ts-ignore
        (categorie &&
          typeof categorie !== 'string' &&
          ' _id' in categorie &&
          // @ts-ignore
          row?.produit?.categorie?._id === categorie._id);
      const matchPointVente = !selectedPointVente || row.pointVente?._id === selectedPointVente._id;
      const matchType = !selectedType || selectedType === 'Tout' || row.type === selectedType;
      return matchCategorie && matchPointVente && matchType;
    });
    setFilteredMvtStocks(filtered);
  }, [mvtStocks, categorie, selectedPointVente, selectedType]);

  const filteredStocks = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return filteredBase.filter((s) => {
      const cat =
        typeof s.produit?.categorie === 'object' && s.produit?.categorie !== null
          ? s.produit.categorie.nom?.toLowerCase() || ''
          : '';
      const prod = s.produit?.nom?.toLowerCase() || '';
      const pv = s.pointVente?.nom?.toLowerCase() || 'depot central';
      const quantite = String(s.quantite || '').toLowerCase();
      const montant = String(s.montant || '').toLowerCase();
      const date = new Date(s.createdAt || '').toLocaleDateString().toLowerCase();
      return [cat, prod, pv, quantite, montant, date].some((field) => field.includes(lowerSearch));
    });
  }, [search, filteredBase]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Tableau de bord' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-500">du {formattedDate}</h2>
      </div>

      <div className="flex flex-row gap-3">
        <DropdownTimeFilter data={allData} onChange={handleTimeFilterChange} />
        <DropdownTypeFilter mvtStocks={mvtStocks} onChange={(_, type) => setSelectedType(type)} />
        <DropdownCategorieFilter onSelect={setCategorie} />
        <DropdownPointVenteFilter onSelect={setSelectedPointVente} />
      </div>

      <div className="flex flex-row gap-3 mt-4">
        <StatCard
          title="Entree en stock"
          value="1 250 €"
          change={12.5}
          type="vente"
          data={[100, 120, 150, 140, 180, 160, 200]}
        />
        <StatCard
          title="Livraison"
          value="8 000"
          change={-5.3}
          type="stock"
          data={[300, 280, 260, 270, 250, 245, 240]}
        />
        <StatCard
          title="Sortie de stock"
          value="8 000"
          change={-5.3}
          type="vente"
          data={[300, 280, 350, 270, 250, 400, 1000]}
        />
        <StatCard
          title="Commande"
          value="8 000"
          change={-5.3}
          type="stock"
          data={[100, 250, 150, 500, 620, 290, 740]}
        />
        <StatCard
          title="Vente"
          value="10 000"
          change={-5.3}
          type="vente"
          data={[100, 200, 300, 270, 200, 500, 700]}
        />
      </div>

      {/* premiere zone de graphique */}

      <div className="mt-6 flex gap-2 bg-white p-4 rounded-lg shadow-md">
        <h1 className="text-xl font-semibold text-gray-700">Mouvements de stock charte 1</h1>
      </div>
      {/* deuxieme zone de graphique */}
      <div className="flex flex-row gap-3 mt-6">
        <div className=" w-2/3 flex flex-col gap-3 bg-white p-4 rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-gray-700">Mouvements de stock charte 2</h1>
        </div>
        <div className="w-1/3 flex flex-col gap-3 bg-white p-4 rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-gray-700">Mouvements de stock charte 3</h1>
        </div>
      </div>
      {/* troisieme zone de graphique */}
      <div className="flex flex-row gap-3 mt-6">
        <div className="flex flex-row w-3/5 bg-white p-4 rounded-lg shadow-md">
          <h3>tableau resume</h3>
        </div>
        <div className="w-2/5 gap-2 flex flex-col align-items-center justify-center ">
          <div className="bg-white p-4 rounded-lg shadow-md">mini graphe 1</div>
          <div className="bg-white p-4 rounded-lg shadow-md">mini graphe 2</div>
        </div>
      </div>
    </div>
  );
}
